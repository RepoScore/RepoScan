import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Wallet-Address",
};

interface Vulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'dependency' | 'code_pattern' | 'configuration';
  description: string;
  location: string;
  cve_id?: string;
  details?: string;
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

    const { githubUrl } = await req.json();

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

    const vulnerabilities: Vulnerability[] = [];
    const notes: string[] = [];
    const riskFactors: string[] = [];
    const positiveIndicators: string[] = [];

    await scanBasicSecurity(repoName, repoData.contents, vulnerabilities);

    const codeQualityMetrics = await analyzeCodeQuality(repoName, repoData.contents);

    const safetyBreakdown = calculateSafety(repoData, notes, riskFactors, positiveIndicators);
    const legitimacyBreakdown = calculateLegitimacy(repoData, notes, riskFactors, positiveIndicators);

    const safety_score = Math.round(safetyBreakdown.total);
    const legitimacy_score = Math.round(legitimacyBreakdown.total);
    const overall_score = Math.round(0.45 * safety_score + 0.55 * legitimacy_score);
    const confidence = calculateConfidence(repoData, safetyBreakdown, legitimacyBreakdown);

    const vulnerabilitySummary = {
      total_count: vulnerabilities.length,
      critical_count: vulnerabilities.filter(v => v.severity === 'critical').length,
      high_count: vulnerabilities.filter(v => v.severity === 'high').length,
      medium_count: vulnerabilities.filter(v => v.severity === 'medium').length,
      low_count: vulnerabilities.filter(v => v.severity === 'low').length,
      by_type: {
        dependency: vulnerabilities.filter(v => v.type === 'dependency').length,
        code_pattern: vulnerabilities.filter(v => v.type === 'code_pattern').length,
        configuration: vulnerabilities.filter(v => v.type === 'configuration').length,
      }
    };

    const scoringResult = {
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
      code_quality_metrics: codeQualityMetrics
    };

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
          has_token_access: false,
          scans_remaining: null,
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

async function scanBasicSecurity(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const hasEnv = contents.some(f => f.name === '.env');
  if (hasEnv) {
    vulnerabilities.push({
      severity: 'critical',
      type: 'configuration',
      description: 'Environment file (.env) committed to repository',
      location: '.env',
      details: 'This file may contain sensitive credentials'
    });
  }

  const packageJson = contents.find(f => f.name === 'package.json');
  if (packageJson) {
    const knownVulnPackages = ['node-ipc', 'event-stream'];
    vulnerabilities.push({
      severity: 'medium',
      type: 'dependency',
      description: 'JavaScript dependencies detected - manual review recommended',
      location: 'package.json',
      details: 'Check for known vulnerable packages'
    });
  }
}

async function analyzeCodeQuality(repoName: string, contents: any[]): Promise<any> {
  const codeFiles = contents.filter(f =>
    f.type === 'file' &&
    !f.name.startsWith('.') &&
    /\.(js|ts|jsx|tsx|py|go|rs|java|cpp|c|h|rb|php|swift|kt)$/i.test(f.name)
  );

  const totalFiles = codeFiles.length;
  let totalSize = 0;
  let largeFilesCount = 0;
  const issues: string[] = [];

  for (const file of codeFiles) {
    if (file.size) {
      totalSize += file.size;
      if (file.size > 50000) {
        largeFilesCount++;
      }
    }
  }

  const avgFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

  const hasTests = contents.some(f =>
    /test|spec|__tests__/i.test(f.name) ||
    /\.(test|spec)\.(js|ts|jsx|tsx|py)$/i.test(f.name)
  );

  const hasLinter = contents.some(f =>
    ['eslint', 'tslint', 'pylint', '.eslintrc', '.pylintrc'].some(lint =>
      f.name.toLowerCase().includes(lint)
    )
  );

  const hasFormatter = contents.some(f =>
    ['prettier', '.prettierrc', 'black', '.editorconfig'].some(fmt =>
      f.name.toLowerCase().includes(fmt)
    )
  );

  let qualityScore = 50;

  if (hasTests) {
    qualityScore += 20;
  } else {
    issues.push('No test files detected');
  }

  if (hasLinter) qualityScore += 10;
  if (hasFormatter) qualityScore += 5;

  if (largeFilesCount > 0) {
    qualityScore -= Math.min(15, largeFilesCount * 3);
    issues.push(`${largeFilesCount} large files (>50KB) detected`);
  }

  if (avgFileSize > 30000) {
    qualityScore -= 10;
    issues.push('High average file size');
  }

  if (totalFiles > 0 && totalFiles < 3) {
    qualityScore -= 15;
    issues.push('Very few code files - may be incomplete');
  }

  return {
    total_files_analyzed: totalFiles,
    avg_file_size: Math.round(avgFileSize),
    avg_complexity: 0,
    code_duplication_risk: 0,
    comment_ratio: 0,
    large_files_count: largeFilesCount,
    quality_score: Math.max(0, Math.min(100, qualityScore)),
    issues
  };
}

function calculateSafety(data: any, notes: string[], risks: string[], positives: string[]): any {
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

function scoreDependencyRisks(contents: any[], risks: string[], positives: string[]): number {
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

function scoreCodeSecurity(contents: any[], repo: any, risks: string[], positives: string[]): number {
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

  return clamp(score, 0, 100);
}

function scoreConfigHygiene(contents: any[], risks: string[], positives: string[]): number {
  let score = 50;

  const hasGitignore = contents.some(f => f.name === '.gitignore');
  if (hasGitignore) {
    score += 30;
    positives.push("Has .gitignore file");
  } else {
    score -= 20;
    risks.push("Missing .gitignore file");
  }

  const hasEnv = contents.some(f => f.name === '.env');
  if (hasEnv) {
    score -= 40;
    risks.push("WARNING: .env file committed (may expose secrets)");
  }

  return clamp(score, 0, 100);
}

function scoreCodeQuality(contents: any[], repo: any, risks: string[], positives: string[]): number {
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

function scoreMaintenancePosture(commits: any[], repo: any, risks: string[], positives: string[]): number {
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
  }

  return clamp(score, 0, 100);
}

function calculateLegitimacy(data: any, notes: string[], risks: string[], positives: string[]): any {
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

function scoreWorkingEvidence(contents: any[], commits: any[], risks: string[], positives: string[]): number {
  let score = 30;

  const srcDirs = ['src', 'lib', 'app', 'core', 'components'];
  const hasSrcDir = contents.some(f => f.type === 'dir' && srcDirs.includes(f.name.toLowerCase()));
  if (hasSrcDir) {
    score += 30;
    positives.push("Has organized source code structure");
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

function scoreTransparency(contents: any[], repo: any, risks: string[], positives: string[]): number {
  let score = 30;

  const hasReadme = contents.some(f => f.name.toLowerCase().startsWith('readme'));
  if (hasReadme) {
    score += 30;
  } else {
    score -= 30;
    risks.push("No README documentation");
  }

  if (repo.description && repo.description.length > 10) {
    score += 15;
  } else {
    score -= 10;
    risks.push("No repository description");
  }

  return clamp(score, 0, 100);
}

function scoreCommunitySignals(repo: any, risks: string[], positives: string[]): number {
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

  if (repo.stargazers_count === 0 && repo.forks_count === 0) {
    risks.push("No community engagement (0 stars, 0 forks)");
  }

  return clamp(score, 0, 100);
}

function scoreAuthorReputation(owner: any, contributors: any[], risks: string[], positives: string[]): number {
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
  }

  return clamp(score, 0, 100);
}

function scoreLicenseCompliance(repo: any, risks: string[], positives: string[]): number {
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

function calculateConfidence(data: any, safety: any, legitimacy: any): number {
  let confidence = 70;

  if (data.commits.length >= 20) confidence += 10;
  if (data.repo.stargazers_count > 50) confidence += 10;
  if (data.contributors && data.contributors.length > 3) confidence += 5;

  return clamp(confidence, 0, 100);
}

function generateSummary(result: any): string {
  const safetyLevel = result.safety_score >= 70 ? "secure" : result.safety_score >= 40 ? "moderate risk" : "high risk";
  const legLevel = result.legitimacy_score >= 70 ? "legitimate" : result.legitimacy_score >= 40 ? "uncertain" : "questionable";

  return `Repository appears ${safetyLevel} and ${legLevel}. Overall score: ${result.overall_score}/100 with ${result.confidence}% confidence.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
