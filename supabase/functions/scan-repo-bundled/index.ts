import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { repoUrl, githubToken } = await req.json();
    
    if (!repoUrl) {
      throw new Error('Repository URL is required');
    }

    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = repoMatch;
    const repoName = `${owner}/${repo.replace(/\.git$/, '')}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RepoScan-Security-Analyzer'
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const repoInfoResponse = await fetch(
      `https://api.github.com/repos/${repoName}`,
      { headers }
    );

    if (!repoInfoResponse.ok) {
      const errorText = await repoInfoResponse.text();
      throw new Error(`Failed to fetch repository: ${repoInfoResponse.status} - ${errorText}`);
    }

    const repoInfo = await repoInfoResponse.json();

    const contentsResponse = await fetch(
      `https://api.github.com/repos/${repoName}/contents`,
      { headers }
    );

    let contents = [];
    if (contentsResponse.ok) {
      contents = await contentsResponse.json();
    }

    const securityScore = await calculateSecurityScore(repoName, repoInfo, contents, headers);
    const legitimacyScore = await calculateLegitimacyScore(repoInfo);
    const vulnerabilities = await scanVulnerabilities(repoName, contents, headers);
    const codeQuality = await analyzeCodeQuality(repoName, contents);

    const overallScore = Math.round((securityScore + legitimacyScore) / 2);
    const confidence = Math.min(95, 70 + (repoInfo.stargazers_count > 100 ? 15 : 0) + (repoInfo.forks_count > 50 ? 10 : 0));

    const { data: scanData, error: insertError } = await supabaseClient
      .from('repo_scans')
      .insert({
        repo_name: repoName,
        repo_url: repoUrl,
        security_score: securityScore,
        legitimacy_score: legitimacyScore,
        overall_score: overallScore,
        confidence: confidence,
        stars: repoInfo.stargazers_count || 0,
        forks: repoInfo.forks_count || 0,
        open_issues: repoInfo.open_issues_count || 0,
        last_commit: repoInfo.pushed_at,
        created_at: repoInfo.created_at,
        has_license: !!repoInfo.license,
        vulnerabilities: vulnerabilities,
        code_quality: codeQuality
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: scanData
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in scan-repo function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function calculateSecurityScore(
  repoName: string,
  repoInfo: any,
  contents: any[],
  headers: Record<string, string>
): Promise<number> {
  let score = 50;

  if (repoInfo.has_issues) score += 5;
  if (repoInfo.has_wiki) score += 5;
  
  const hasSecurityPolicy = contents.some(f => 
    f.name.toLowerCase() === 'security.md' || 
    f.path?.toLowerCase().includes('security')
  );
  if (hasSecurityPolicy) score += 10;

  const hasLicense = !!repoInfo.license;
  if (hasLicense) score += 10;

  const hasReadme = contents.some(f => f.name.toLowerCase().startsWith('readme'));
  if (hasReadme) score += 5;

  const hasCI = contents.some(f => 
    f.name === '.github' || 
    f.name === '.gitlab-ci.yml' || 
    f.name === '.travis.yml' ||
    f.name === 'Jenkinsfile'
  );
  if (hasCI) score += 10;

  if (repoInfo.stargazers_count > 100) score += 5;
  if (repoInfo.stargazers_count > 1000) score += 5;
  if (repoInfo.forks_count > 50) score += 5;

  return Math.min(100, Math.max(0, score));
}

async function calculateLegitimacyScore(repoInfo: any): Promise<number> {
  let score = 50;

  const accountAge = Date.now() - new Date(repoInfo.created_at).getTime();
  const daysOld = accountAge / (1000 * 60 * 60 * 24);
  
  if (daysOld > 365) score += 10;
  if (daysOld > 730) score += 5;

  if (repoInfo.stargazers_count > 50) score += 5;
  if (repoInfo.stargazers_count > 500) score += 10;
  if (repoInfo.stargazers_count > 5000) score += 5;

  if (repoInfo.forks_count > 10) score += 5;
  if (repoInfo.forks_count > 100) score += 5;

  const lastUpdate = Date.now() - new Date(repoInfo.pushed_at).getTime();
  const daysSinceUpdate = lastUpdate / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate < 30) score += 5;
  if (daysSinceUpdate < 90) score += 5;

  if (repoInfo.description && repoInfo.description.length > 20) score += 5;

  return Math.min(100, Math.max(0, score));
}

async function scanVulnerabilities(
  repoName: string,
  contents: any[],
  headers: Record<string, string>
): Promise<any[]> {
  const vulnerabilities = [];

  const envFile = contents.find(f => f.name === '.env' || f.name === '.env.example');
  if (envFile && envFile.name === '.env') {
    vulnerabilities.push({
      severity: 'high',
      type: 'secrets',
      description: 'Environment file committed to repository',
      location: '.env',
      details: 'This file may contain sensitive credentials'
    });
  }

  const packageJson = contents.find(f => f.name === 'package.json');
  const packageLockJson = contents.find(f => f.name === 'package-lock.json');

  if (packageJson && !packageLockJson) {
    vulnerabilities.push({
      severity: 'medium',
      type: 'dependency',
      description: 'Missing package-lock.json - unlocked dependencies detected',
      location: 'package.json',
      details: 'Dependencies are not locked to specific versions, which can lead to inconsistent builds and potential security issues'
    });
  }

  return vulnerabilities;
}

async function analyzeCodeQuality(repoName: string, contents: any[]): Promise<any> {
  const codeFiles = contents.filter(f => 
    f.type === 'file' && 
    (f.name.endsWith('.js') || 
     f.name.endsWith('.ts') || 
     f.name.endsWith('.jsx') || 
     f.name.endsWith('.tsx') ||
     f.name.endsWith('.py') ||
     f.name.endsWith('.java') ||
     f.name.endsWith('.go'))
  );

  const hasTests = contents.some(f => 
    f.name.includes('test') || 
    f.name.includes('spec') ||
    f.name === '__tests__'
  );

  const hasLinter = contents.some(f => 
    f.name === '.eslintrc' ||
    f.name === '.eslintrc.js' ||
    f.name === '.eslintrc.json' ||
    f.name === 'eslint.config.js' ||
    f.name === '.pylintrc' ||
    f.name === 'tslint.json'
  );

  const hasFormatter = contents.some(f => 
    f.name === '.prettierrc' ||
    f.name === '.prettierrc.js' ||
    f.name === '.prettierrc.json' ||
    f.name === '.editorconfig'
  );

  const hasTypeChecking = contents.some(f => 
    f.name === 'tsconfig.json' ||
    f.name === 'mypy.ini'
  );

  let qualityScore = 50;
  if (hasTests) qualityScore += 20;
  if (hasLinter) qualityScore += 15;
  if (hasFormatter) qualityScore += 10;
  if (hasTypeChecking) qualityScore += 15;

  return {
    score: Math.min(100, qualityScore),
    metrics: {
      has_tests: hasTests,
      has_linter: hasLinter,
      has_formatter: hasFormatter,
      has_type_checking: hasTypeChecking,
      code_files_count: codeFiles.length
    }
  };
}