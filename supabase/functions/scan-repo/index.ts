import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { checkAccess, verifyTokenBalance } from "../_shared/tokenGate.ts";
import { scanDependencyVulnerabilities, calculateVulnerabilitySummary, Vulnerability } from "../_shared/vulnerabilityScanner.ts";
import { detectCodePatterns } from "../_shared/codePatternDetector.ts";

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

    const [depVulnerabilities, codePatternVulnerabilities] = await Promise.all([
      scanDependencyVulnerabilities(repoName, repoData.contents),
      detectCodePatterns(repoName, repoData.contents)
    ]);

    const allVulnerabilities = [...depVulnerabilities, ...codePatternVulnerabilities];
    const vulnerabilitySummary = calculateVulnerabilitySummary(allVulnerabilities);

    const scoringResult = scoreRepository(repoData, allVulnerabilities, vulnerabilitySummary);

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

function scoreRepository(data: any, vulnerabilities: Vulnerability[], vulnerabilitySummary: any): ScoringResult {
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
      positives.push("Multiple contributors (" + uniqueAuthors + ")");
    }
  } else {
    risks.push("No commit history available");
  }

  return clamp(score, 0, 100);
}

function calculateLegitimacy(
  data: any,
  notes: string[],
  risks: string[],
  positives: string[]
): LegitimacyBreakdown {
  const working = scoreWorkingEvidence(data.contents, data.repo, data.commits, risks, positives);
  const transparency = scoreTransparency(data.contents, data.repo, risks, positives);
  const community = scoreCommunity(data.repo, data.contributors, risks, positives);
  const author = scoreAuthorReputation(data.owner, data.repo, risks, positives);
  const license = scoreLicenseCompliance(data.repo, risks, positives);

  const total = 
    working * 0.40 +
    transparency * 0.20 +
    community * 0.15 +
    author * 0.15 +
    license * 0.10;

  return {
    total,
    working_evidence: working,
    transparency_docs: transparency,
    community_signals: community,
    author_reputation: author,
    license_compliance: license,
  };
}

function scoreWorkingEvidence(
  contents: any[],
  repo: any,
  commits: any[],
  risks: string[],
  positives: string[]
): number {
  let score = 30;

  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'go.sum', 'poetry.lock'];
  const hasLock = contents.some(f => lockFiles.includes(f.name));
  
  if (hasLock) {
    score += 20;
    positives.push("Reproducible environment with lock files");
  } else {
    risks.push("No lock file - build may not be reproducible");
  }

  const hasDocker = contents.some(f => f.name.toLowerCase().includes('dockerfile'));
  if (hasDocker) {
    score += 15;
    positives.push("Has Dockerfile for containerized builds");
  }

  const exampleDirs = ['examples', 'example', 'demo', 'demos', 'samples'];
  const hasExamples = contents.some(f => exampleDirs.some(d => f.name.toLowerCase().includes(d)));
  
  if (hasExamples) {
    score += 20;
    positives.push("Includes example code/demos");
  } else {
    risks.push("No example code found");
  }

  const ciFiles = ['.github', '.gitlab-ci.yml', '.travis.yml', 'azure-pipelines.yml', '.circleci'];
  const hasCI = contents.some(f => ciFiles.some(ci => f.name.includes(ci)));
  
  if (hasCI) {
    score += 15;
    positives.push("Has CI/CD configuration");
  }

  return clamp(score, 0, 100);
}

function scoreTransparency(
  contents: any[],
  repo: any,
  risks: string[],
  positives: string[]
): number {
  let score = 20;

  const hasReadme = contents.some(f => f.name.toLowerCase().includes('readme'));
  if (hasReadme) {
    score += 35;
  } else {
    score -= 20;
    risks.push("No README found");
  }

  if (repo.description && repo.description.length > 30) {
    score += 20;
    positives.push("Has detailed description");
  } else if (!repo.description || repo.description.length < 10) {
    risks.push("Missing or minimal description");
  }

  const hasContributing = contents.some(f => f.name.toLowerCase() === 'contributing.md');
  if (hasContributing) {
    score += 15;
    positives.push("Has CONTRIBUTING.md guidelines");
  }

  const hasChangelog = contents.some(f => f.name.toLowerCase().includes('changelog'));
  if (hasChangelog) {
    score += 10;
    positives.push("Maintains a changelog");
  }

  return clamp(score, 0, 100);
}

function scoreCommunity(
  repo: any,
  contributors: any[],
  risks: string[],
  positives: string[]
): number {
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  
  let score = 20;

  const starScore = Math.min(Math.log10(stars + 1) / 4 * 100, 100);
  score += starScore * 0.40;

  if (stars > 1000) {
    positives.push("Highly popular: " + stars + " stars");
  } else if (stars > 100) {
    positives.push("Popular: " + stars + " stars");
  } else if (stars < 5) {
    risks.push("Very low star count");
  }

  if (contributors.length > 5) {
    score += 25;
    positives.push(contributors.length + "+ contributors");
  } else if (contributors.length === 1) {
    score += 5;
    risks.push("Single contributor project");
  } else {
    score += 15;
  }

  if (forks > 50) {
    score += 15;
    positives.push(forks + " forks");
  }

  return clamp(score, 0, 100);
}

function scoreAuthorReputation(
  owner: any,
  repo: any,
  risks: string[],
  positives: string[]
): number {
  if (!owner) return 30;

  let score = 40;

  if (owner.type === 'Organization') {
    score += 30;
    positives.push("Owned by an organization");
  }

  const accountAge = (Date.now() - new Date(owner.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAge > 730) {
    score += 20;
    positives.push("Well-established account (2+ years)");
  } else if (accountAge < 90) {
    score -= 10;
    risks.push("Relatively new account");
  } else {
    score += 10;
  }

  if (owner.public_repos > 5) {
    score += 10;
    positives.push(owner.public_repos + " public repositories");
  } else if (owner.public_repos === 1) {
    risks.push("Only one public repository");
  }

  return clamp(score, 0, 100);
}

function scoreLicenseCompliance(
  repo: any,
  risks: string[],
  positives: string[]
): number {
  if (!repo.license) {
    risks.push("No license - unclear usage rights");
    return 30;
  }

  let score = 70;
  positives.push("Licensed: " + repo.license.name);

  const popularLicenses = ['MIT', 'Apache', 'GPL', 'BSD', 'ISC', 'Mozilla'];
  const isPopular = popularLicenses.some(l => repo.license.name.includes(l));
  
  if (isPopular) {
    score += 30;
  } else {
    score += 10;
  }

  return clamp(score, 0, 100);
}

function calculateConfidence(
  data: any,
  safety: SafetyBreakdown,
  legitimacy: LegitimacyBreakdown
): number {
  let signalsAttempted = 0;
  let signalsSuccessful = 0;

  if (data.repo) signalsSuccessful++;
  signalsAttempted++;

  if (data.contents && data.contents.length > 0) signalsSuccessful++;
  signalsAttempted++;

  if (data.commits && data.commits.length > 0) signalsSuccessful++;
  signalsAttempted++;

  if (data.contributors) signalsSuccessful++;
  signalsAttempted++;

  if (data.owner) signalsSuccessful++;
  signalsAttempted++;

  const dataQuality = signalsSuccessful / signalsAttempted;

  const avgScore = (safety.total + legitimacy.total) / 2;
  const scoreConfidence = avgScore > 30 ? 0.8 : 0.5;

  const confidence = 0.6 * dataQuality + 0.4 * scoreConfidence;
  
  return Number(confidence.toFixed(2));
}

function generateSummary(result: ScoringResult): string {
  const overall = result.overall_score;
  
  if (overall >= 70) {
    return "This repository demonstrates strong safety practices and legitimate development patterns with solid community trust.";
  } else if (overall >= 50) {
    return "This repository shows moderate indicators of quality and legitimacy. Review the risk factors carefully before use.";
  } else {
    return "This repository has significant concerns. Thoroughly review all risk factors and exercise caution before using this code.";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}