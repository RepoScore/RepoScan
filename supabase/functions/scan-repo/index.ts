import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { checkAccess, verifyTokenBalance } from "../_shared/tokenGate.ts";
import { scanDependencyVulnerabilities, calculateVulnerabilitySummary, Vulnerability } from "../_shared/vulnerabilityScanner.ts";
import { detectCodePatterns } from "../_shared/codePatternDetector.ts";
import { scanConfigurationVulnerabilities } from "../_shared/configurationScanner.ts";
import { scanSupplyChain } from "../_shared/supplyChainScanner.ts";
import { scanGitHubSecurity } from "../_shared/githubSecurityScanner.ts";
import { analyzeCodeQuality, CodeQualityMetrics } from "../_shared/codeQualityAnalyzer.ts";
import { detectAdvancedPatterns } from "../_shared/advancedPatternDetector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Wallet-Address",
};

interface RepoScanRequest {
  githubUrl: string;
  walletAddress?: string;
  tokenBalance?: number;
}

interface ScoringResult {
  safety_score: number;
  legitimacy_score: number;
  overall_score: number;
  confidence: number;
  breakdown: {
    safety: SafetyBreakdown;
    legitimacy: LegitimacyBreakdown;
  };
  notes: string[];
  risk_factors: string[];
  positive_indicators: string[];
  vulnerabilities: Vulnerability[];
  vulnerability_summary: any;
  code_quality_metrics: CodeQualityMetrics;
}

interface SafetyBreakdown {
  total: number;
  dependency_risks: number;
  code_security: number;
  config_hygiene: number;
  code_quality: number;
  maintenance_posture: number;
}

interface LegitimacyBreakdown {
  total: number;
  working_evidence: number;
  transparency_docs: number;
  community_signals: number;
  author_reputation: number;
  license_compliance: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { githubUrl, walletAddress, tokenBalance }: RepoScanRequest = await req.json();

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                     req.headers.get("x-real-ip") ||
                     "unknown";

    const accessCheck = await checkAccess(
      supabase,
      walletAddress || null,
      clientIp,
      tokenBalance
    );

    if (!accessCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: accessCheck.reason,
          token_gate_active: true,
          scans_remaining: accessCheck.scans_remaining,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/([\w-]+)\/([\w.-]+)\/?$/;
    const match = githubUrl.match(githubUrlPattern);
    
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Invalid GitHub URL format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const owner = match[2];
    const repoSlug = match[3];
    const repoName = `${owner}/${repoSlug}`;

    const repoData = await fetchRepoData(repoName, owner);

    if (!repoData.repo) {
      return new Response(
        JSON.stringify({ error: "Repository not found or unavailable" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const [
      depVulnerabilities,
      codePatternVulnerabilities,
      configVulnerabilities,
      supplyChainVulnerabilities,
      githubSecurityVulnerabilities,
      advancedPatternVulnerabilities,
      codeQualityMetrics
    ] = await Promise.all([
      scanDependencyVulnerabilities(repoName, repoData.contents),
      detectCodePatterns(repoName, repoData.contents),
      scanConfigurationVulnerabilities(repoName, repoData.contents),
      scanSupplyChain(repoName, repoData.contents),
      scanGitHubSecurity(repoName, repoData),
      detectAdvancedPatterns(repoName, repoData.contents),
      analyzeCodeQuality(repoName, repoData.contents)
    ]);

    const allVulnerabilities = [
      ...depVulnerabilities,
      ...codePatternVulnerabilities,
      ...configVulnerabilities,
      ...supplyChainVulnerabilities,
      ...githubSecurityVulnerabilities,
      ...advancedPatternVulnerabilities
    ];
    const vulnerabilitySummary = calculateVulnerabilitySummary(allVulnerabilities);

    const scoringResult = scoreRepository(repoData, allVulnerabilities, vulnerabilitySummary, codeQualityMetrics);

    const { data: scanResult, error: dbError } = await supabase
      .from("repo_scans")
      .insert({
        github_url: githubUrl,
        repo_name: repoName,
        safety_score: scoringResult.safety_score,
        legitimacy_score: scoringResult.legitimacy_score,
        overall_score: scoringResult.overall_score,
        confidence: scoringResult.confidence,
        breakdown: scoringResult.breakdown,
        notes: scoringResult.notes,
        analysis_summary: generateSummary(scoringResult),
        risk_factors: scoringResult.risk_factors,
        positive_indicators: scoringResult.positive_indicators,
        vulnerabilities: scoringResult.vulnerabilities,
        vulnerability_summary: scoringResult.vulnerability_summary,
        code_quality_metrics: scoringResult.code_quality_metrics,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to store scan results" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        scan: scanResult,
        access_info: {
          has_token_access: accessCheck.has_token_access,
          scans_remaining: accessCheck.scans_remaining,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function fetchRepoData(repoName: string, owner: string) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "RepoScan-App"
  };

  const [repoRes, contentsRes, commitsRes, contributorsRes, ownerRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${repoName}`, { headers }),
    fetch(`https://api.github.com/repos/${repoName}/contents`, { headers }),
    fetch(`https://api.github.com/repos/${repoName}/commits?per_page=30`, { headers }),
    fetch(`https://api.github.com/repos/${repoName}/contributors?per_page=10`, { headers }),
    fetch(`https://api.github.com/users/${owner}`, { headers }),
  ]);

  return {
    repo: repoRes.ok ? await repoRes.json() : null,
    contents: contentsRes.ok ? await contentsRes.json() : [],
    commits: commitsRes.ok ? await commitsRes.json() : [],
    contributors: contributorsRes.ok ? await contributorsRes.json() : [],
    owner: ownerRes.ok ? await ownerRes.json() : null,
  };
}

function scoreRepository(data: any, vulnerabilities: Vulnerability[], vulnerabilitySummary: any, codeQualityMetrics: CodeQualityMetrics): ScoringResult {
  const notes: string[] = [];
  const riskFactors: string[] = [];
  const positiveIndicators: string[] = [];

  if (vulnerabilitySummary.critical_count > 0) {
    riskFactors.push(`CRITICAL: ${vulnerabilitySummary.critical_count} critical vulnerabilities found`);
  }
  if (vulnerabilitySummary.high_count > 0) {
    riskFactors.push(`${vulnerabilitySummary.high_count} high-severity vulnerabilities found`);
  }

  const safetyBreakdown = calculateSafety(data, notes, riskFactors, positiveIndicators, vulnerabilities);
  const legitimacyBreakdown = calculateLegitimacy(data, notes, riskFactors, positiveIndicators);

  const safety_score = Math.round(safetyBreakdown.total);
  const legitimacy_score = Math.round(legitimacyBreakdown.total);
  const overall_score = Math.round(0.45 * safety_score + 0.55 * legitimacy_score);
  
  const confidence = calculateConfidence(data, safetyBreakdown, legitimacyBreakdown);

  if (codeQualityMetrics.quality_score < 50) {
    riskFactors.push(`Low code quality score: ${codeQualityMetrics.quality_score}`);
  }

  if (codeQualityMetrics.issues.length > 0) {
    codeQualityMetrics.issues.slice(0, 3).forEach(issue => {
      riskFactors.push(`Quality: ${issue}`);
    });
  }

  return {
    safety_score,
    legitimacy_score,
    overall_score,
    confidence,
    breakdown: {
      safety: safetyBreakdown,
      legitimacy: legitimacyBreakdown,
    },
    notes,
    risk_factors: riskFactors,
    positive_indicators: positiveIndicators,
    vulnerabilities,
    vulnerability_summary: vulnerabilitySummary,
    code_quality_metrics: codeQualityMetrics,
  };
}

function calculateSafety(
  data: any,
  notes: string[],
  risks: string[],
  positives: string[],
  vulnerabilities?: Vulnerability[]
): SafetyBreakdown {
  const depRisks = scoreDependencyRisks(data.contents, risks, positives);
  const codeSec = scoreCodeSecurity(data.contents, data.repo, risks, positives);
  const configHyg = scoreConfigHygiene(data.contents, risks, positives);
  const codeQual = scoreCodeQuality(data.contents, data.repo, risks, positives);
  const maint = scoreMaintenancePosture(data.commits, data.repo, risks, positives);

  const total = 
    depRisks * 0.30 +
    codeSec * 0.30 +
    configHyg * 0.15 +
    codeQual * 0.15 +
    maint * 0.10;

  return {
    total,
    dependency_risks: depRisks,
    code_security: codeSec,
    config_hygiene: configHyg,
    code_quality: codeQual,
    maintenance_posture: maint,
  };
}

function scoreDependencyRisks(
  contents: any[],
  risks: string[],
  positives: string[]
): number {
  let score = 50;

  const depFiles = ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle'];
  const hasDeps = contents.some(f => depFiles.includes(f.name));

  if (hasDeps) {
    score += 30;
    positives.push("Has dependency management files");
  } else {
    score -= 20;
    risks.push("No standard dependency files detected");
  }

  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'go.sum', 'poetry.lock', 'Pipfile.lock'];
  const hasLock = contents.some(f => lockFiles.includes(f.name));

  if (hasLock) {
    score += 20;
    positives.push("Uses lock files for reproducible builds");
  } else if (hasDeps) {
    score -= 10;
    risks.push("Missing lock file - dependencies not pinned");
  }

  return clamp(score, 0, 100);
}

function scoreCodeSecurity(
  contents: any[],
  repo: any,
  risks: string[],
  positives: string[]
): number {
  let score = 70;

  const dangerousExts = [
    { ext: '.exe', penalty: 30, msg: "Contains Windows executables (.exe)" },
    { ext: '.dll', penalty: 25, msg: "Contains DLL files" },
    { ext: '.so', penalty: 20, msg: "Contains shared object files (.so)" },
    { ext: '.dylib', penalty: 20, msg: "Contains dynamic libraries (.dylib)" },
    { ext: '.bin', penalty: 25, msg: "Contains binary files (.bin)" },
  ];

  for (const { ext, penalty, msg } of dangerousExts) {
    if (contents.some(f => f.name.toLowerCase().endsWith(ext))) {
      score -= penalty;
      risks.push(msg);
    }
  }

  const hasSecurity = contents.some(f => f.name.toLowerCase() === 'security.md');
  if (hasSecurity) {
    score += 20;
    positives.push("Has SECURITY.md policy");
  }

  const scriptFiles = contents.filter(f => ['.sh', '.bat', '.cmd', '.ps1'].some(ext => f.name.endsWith(ext)));
  if (scriptFiles.length > 10) {
    score -= 15;
    risks.push(`High number of script files (${scriptFiles.length})`);
  }

  return clamp(score, 0, 100);
}

function scoreConfigHygiene(
  contents: any[],
  risks: string[],
  positives: string[]
): number {
  let score = 50;

  const hasGitignore = contents.some(f => f.name === '.gitignore');
  if (hasGitignore) {
    score += 30;
    positives.push("Has .gitignore file");
  } else {
    score -= 20;
    risks.push("Missing .gitignore file");
  }

  const hasEnvExample = contents.some(f => ['.env.example', '.env.sample', 'env.example'].includes(f.name));
  if (hasEnvExample) {
    score += 20;
    positives.push("Provides environment variable template");
  }

  const hasEnv = contents.some(f => f.name === '.env');
  if (hasEnv) {
    score -= 40;
    risks.push("WARNING: .env file committed (may expose secrets)");
  }

  const dockerFiles = contents.filter(f => f.name.toLowerCase().includes('dockerfile'));
  if (dockerFiles.length > 0) {
    score += 10;
    positives.push("Has Dockerfile for containerization");
  }

  return clamp(score, 0, 100);
}

function scoreCodeQuality(
  contents: any[],
  repo: any,
  risks: string[],
  positives: string[]
): number {
  let score = 40;

  const hasReadme = contents.some(f => f.name.toLowerCase().includes('readme'));
  if (hasReadme) {
    score += 30;
    positives.push("Has README documentation");
  } else {
    score -= 20;
    risks.push("Missing README file");
  }

  const testIndicators = ['test', 'spec', '__tests__', '.test.', '.spec.'];
  const hasTests = contents.some(f => testIndicators.some(t => f.name.toLowerCase().includes(t)));
  if (hasTests) {
    score += 20;
    positives.push("Includes test files");
  } else {
    risks.push("No test files detected");
  }

  if (repo.license) {
    score += 10;
    positives.push("Licensed: " + repo.license.name);
  } else {
    score -= 10;
    risks.push("No license specified");
  }

  return clamp(score, 0, 100);
}

function scoreMaintenancePosture(
  commits: any[],
  repo: any,
  risks: string[],
  positives: string[]
): number {
  let score = 20;

  if (repo.archived) {
    risks.push("Repository is archived (no longer maintained)");
    return 0;
  }

  if (commits.length > 0) {
    const recentCommits = commits.filter(c => {
      const commitDate = new Date(c.commit.author.date);
      const daysSince = (Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 90;
    });

    if (recentCommits.length >= 5) {
      score += 40;
      positives.push("Active development (5+ commits in 90 days)");
    } else if (recentCommits.length > 0) {
      score += 20;
    }

    const newestCommit = new Date(commits[0].commit.author.date);
    const daysSince = (Date.now() - newestCommit.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < 30) {
      score += 30;
      positives.push("Recently updated (last 30 days)");
    } else if (daysSince > 365) {
      score -= 20;
      risks.push("No commits in over a year");
    }

    const uniqueAuthors = new Set(commits.map(c => c.commit.author.email)).size;
    if (uniqueAuthors >= 3) {
      score += 10;
      positives.push(`Multiple contributors (${uniqueAuthors})`);
    }
  }

  if (repo.has_issues && !repo.disabled) {
    score += 5;
  }

  return clamp(score, 0, 100);
}

function calculateLegitimacy(
  data: any,
  notes: string[],
  risks: string[],
  positives: string[]
): LegitimacyBreakdown {
  const workingEvidence = scoreWorkingEvidence(data.contents, data.commits, risks, positives);
  const transpDocs = scoreTransparency(data.contents, data.repo, risks, positives);
  const commSignals = scoreCommunitySignals(data.repo, risks, positives);
  const authorRep = scoreAuthorReputation(data.owner, data.contributors, risks, positives);
  const licenseComp = scoreLicenseCompliance(data.repo, risks, positives);

  const total = 
    workingEvidence * 0.25 +
    transpDocs * 0.20 +
    commSignals * 0.25 +
    authorRep * 0.20 +
    licenseComp * 0.10;

  return {
    total,
    working_evidence: workingEvidence,
    transparency_docs: transpDocs,
    community_signals: commSignals,
    author_reputation: authorRep,
    license_compliance: licenseComp,
  };
}

function scoreWorkingEvidence(
  contents: any[],
  commits: any[],
  risks: string[],
  positives: string[]
): number {
  let score = 30;

  const srcDirs = ['src', 'lib', 'app', 'core', 'components'];
  const hasSrcDir = contents.some(f => f.type === 'dir' && srcDirs.includes(f.name.toLowerCase()));
  if (hasSrcDir) {
    score += 30;
    positives.push("Has organized source code structure");
  }

  const mainFiles = ['index.js', 'index.ts', 'main.py', 'main.rs', 'main.go', 'app.js', 'server.js'];
  const hasMain = contents.some(f => mainFiles.includes(f.name.toLowerCase()));
  if (hasMain) {
    score += 20;
    positives.push("Has entry point file");
  }

  if (commits.length >= 10) {
    score += 20;
    positives.push("Has substantial commit history");
  } else if (commits.length < 3) {
    score -= 20;
    risks.push("Very few commits - may be incomplete");
  }

  return clamp(score, 0, 100);
}

function scoreTransparency(
  contents: any[],
  repo: any,
  risks: string[],
  positives: string[]
): number {
  let score = 30;

  const hasReadme = contents.some(f => f.name.toLowerCase().startsWith('readme'));
  if (hasReadme) {
    score += 30;
  } else {
    score -= 30;
    risks.push("No README documentation");
  }

  const hasChangelog = contents.some(f => f.name.toLowerCase().includes('changelog') || f.name.toLowerCase().includes('history'));
  if (hasChangelog) {
    score += 15;
    positives.push("Maintains changelog");
  }

  const hasContributing = contents.some(f => f.name.toLowerCase().includes('contributing'));
  if (hasContributing) {
    score += 10;
    positives.push("Has contribution guidelines");
  }

  if (repo.description && repo.description.length > 10) {
    score += 15;
  } else {
    score -= 10;
    risks.push("No repository description");
  }

  return clamp(score, 0, 100);
}

function scoreCommunitySignals(
  repo: any,
  risks: string[],
  positives: string[]
): number {
  let score = 0;

  if (repo.stargazers_count > 1000) {
    score += 40;
    positives.push(`Highly starred (${repo.stargazers_count} stars)`);
  } else if (repo.stargazers_count > 100) {
    score += 30;
    positives.push(`Well-received (${repo.stargazers_count} stars)`);
  } else if (repo.stargazers_count > 10) {
    score += 15;
  } else {
    score += 5;
  }

  if (repo.forks_count > 50) {
    score += 20;
    positives.push(`Active community (${repo.forks_count} forks)`);
  } else if (repo.forks_count > 10) {
    score += 10;
  }

  if (repo.watchers_count > 20) {
    score += 15;
  } else if (repo.watchers_count > 5) {
    score += 8;
  }

  if (repo.open_issues_count > 0 && repo.open_issues_count < 50) {
    score += 10;
  } else if (repo.open_issues_count >= 50) {
    score += 5;
    risks.push(`High number of open issues (${repo.open_issues_count})`);
  }

  if (repo.has_discussions) {
    score += 5;
  }

  if (repo.stargazers_count === 0 && repo.forks_count === 0) {
    risks.push("No community engagement (0 stars, 0 forks)");
  }

  return clamp(score, 0, 100);
}

function scoreAuthorReputation(
  owner: any,
  contributors: any[],
  risks: string[],
  positives: string[]
): number {
  let score = 20;

  if (owner) {
    if (owner.public_repos > 20) {
      score += 25;
      positives.push("Author has substantial GitHub presence");
    } else if (owner.public_repos > 5) {
      score += 15;
    }

    if (owner.followers > 100) {
      score += 20;
      positives.push(`Author has strong reputation (${owner.followers} followers)`);
    } else if (owner.followers > 20) {
      score += 10;
    }

    const accountAge = Date.now() - new Date(owner.created_at).getTime();
    const accountAgeYears = accountAge / (1000 * 60 * 60 * 24 * 365);
    if (accountAgeYears > 3) {
      score += 15;
      positives.push("Established GitHub account");
    } else if (accountAgeYears < 0.25) {
      score -= 15;
      risks.push("Very new GitHub account");
    }

    if (owner.company || owner.blog) {
      score += 10;
    }
  }

  if (contributors && contributors.length > 5) {
    score += 10;
    positives.push("Multiple contributors");
  }

  return clamp(score, 0, 100);
}

function scoreLicenseCompliance(
  repo: any,
  risks: string[],
  positives: string[]
): number {
  let score = 0;

  if (repo.license) {
    const licenseName = repo.license.name.toLowerCase();
    if (licenseName.includes('mit') || licenseName.includes('apache') || licenseName.includes('bsd')) {
      score = 100;
      positives.push(`Permissive license: ${repo.license.name}`);
    } else if (licenseName.includes('gpl')) {
      score = 70;
      positives.push(`Open source license: ${repo.license.name}`);
    } else {
      score = 50;
    }
  } else {
    score = 30;
    risks.push("No license specified");
  }

  return clamp(score, 0, 100);
}

function calculateConfidence(
  data: any,
  safety: SafetyBreakdown,
  legitimacy: LegitimacyBreakdown
): number {
  let confidence = 70;

  if (data.commits.length >= 20) confidence += 10;
  if (data.repo.stargazers_count > 50) confidence += 10;
  if (data.contributors && data.contributors.length > 3) confidence += 5;
  if (data.contents.some((f: any) => f.name.toLowerCase().includes('test'))) confidence += 5;

  return clamp(confidence, 0, 100);
}

function generateSummary(result: ScoringResult): string {
  const safetyLevel = result.safety_score >= 70 ? "secure" : result.safety_score >= 40 ? "moderate risk" : "high risk";
  const legLevel = result.legitimacy_score >= 70 ? "legitimate" : result.legitimacy_score >= 40 ? "uncertain" : "questionable";
  
  return `Repository appears ${safetyLevel} and ${legLevel}. Overall score: ${result.overall_score}/100 with ${result.confidence}% confidence.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
