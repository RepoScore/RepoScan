import { Vulnerability } from './vulnerabilityScanner.ts';

export async function scanGitHubSecurity(
  repoName: string,
  repoData: any
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];

  await Promise.all([
    checkBranchProtection(repoName, vulnerabilities),
    checkSecurityPolicy(repoData.contents, vulnerabilities),
    checkGitHubActions(repoName, repoData.contents, vulnerabilities),
    checkRepoSettings(repoData.repo, vulnerabilities),
  ]);

  return vulnerabilities;
}

async function checkBranchProtection(
  repoName: string,
  vulnerabilities: Vulnerability[]
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/branches/main`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'RepoScan-App'
        }
      }
    );

    if (response.ok) {
      const branch = await response.json();
      if (!branch.protected) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Main branch is not protected',
          location: 'GitHub Settings',
          details: 'Enable branch protection to prevent force pushes and require reviews'
        });
      } else {
        const protection = branch.protection;
        if (!protection?.required_pull_request_reviews) {
          vulnerabilities.push({
            severity: 'low',
            type: 'configuration',
            description: 'No required pull request reviews',
            location: 'GitHub Settings',
            details: 'Require code reviews before merging to main'
          });
        }
      }
    }
  } catch (error) {
    const masterResponse = await fetch(
      `https://api.github.com/repos/${repoName}/branches/master`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'RepoScan-App'
        }
      }
    ).catch(() => null);

    if (masterResponse?.ok) {
      const branch = await masterResponse.json();
      if (!branch.protected) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Master branch is not protected',
          location: 'GitHub Settings',
          details: 'Enable branch protection to prevent force pushes and require reviews'
        });
      }
    }
  }
}

async function checkSecurityPolicy(
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
}

async function checkGitHubActions(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const workflowFiles = contents.filter(f =>
    f.path && f.path.includes('.github/workflows/')
  );

  if (workflowFiles.length === 0) return;

  for (const workflow of workflowFiles) {
    try {
      const content = await fetchFileContent(repoName, workflow.path);
      if (!content) continue;

      if (/actions\/checkout@v[12](?!\d)/.test(content)) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Outdated actions/checkout version',
          location: workflow.path,
          details: 'Update to actions/checkout@v3 or later for security improvements'
        });
      }

      if (/uses:.*@master/.test(content)) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'GitHub Action pinned to @master branch',
          location: workflow.path,
          details: 'Pin actions to specific commit SHA or version tag'
        });
      }

      if (/secrets\.(GITHUB_TOKEN|.*PASSWORD|.*SECRET|.*KEY).*>>/i.test(content)) {
        vulnerabilities.push({
          severity: 'critical',
          type: 'configuration',
          description: 'Secret potentially written to file in workflow',
          location: workflow.path,
          details: 'Never write secrets to files or logs'
        });
      }

      if (/run:.*curl.*\|\s*bash/i.test(content)) {
        vulnerabilities.push({
          severity: 'high',
          type: 'configuration',
          description: 'Piping curl to bash in GitHub Actions',
          location: workflow.path,
          details: 'Downloading and executing scripts is dangerous. Use verified actions instead'
        });
      }

      if (/on:\s*push/.test(content) && !/branches:/i.test(content)) {
        vulnerabilities.push({
          severity: 'low',
          type: 'configuration',
          description: 'Workflow triggers on all pushes',
          location: workflow.path,
          details: 'Consider limiting workflow triggers to specific branches'
        });
      }

      const unsafeContexts = [
        'github.event.issue.title',
        'github.event.issue.body',
        'github.event.pull_request.title',
        'github.event.pull_request.body',
        'github.event.comment.body',
        'github.head_ref',
      ];

      for (const ctx of unsafeContexts) {
        const escapedCtx = ctx.replace(/\./g, '\\.');
        const pattern = new RegExp(`\\$\\{\\{\\s*${escapedCtx}`, 'i');
        if (pattern.test(content)) {
          vulnerabilities.push({
            severity: 'critical',
            type: 'configuration',
            description: `Script injection risk using ${ctx}`,
            location: workflow.path,
            details: 'User-controlled data in run commands can lead to code injection'
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning workflow ${workflow.path}:`, error);
    }
  }
}

async function checkRepoSettings(
  repo: any,
  vulnerabilities: Vulnerability[]
): Promise<void> {
  if (repo.security_and_analysis) {
    if (repo.security_and_analysis.secret_scanning?.status !== 'enabled') {
      vulnerabilities.push({
        severity: 'medium',
        type: 'configuration',
        description: 'GitHub secret scanning not enabled',
        location: 'GitHub Settings',
        details: 'Enable secret scanning to detect committed secrets'
      });
    }

    if (repo.security_and_analysis.dependabot_security_updates?.status !== 'enabled') {
      vulnerabilities.push({
        severity: 'medium',
        type: 'configuration',
        description: 'Dependabot security updates not enabled',
        location: 'GitHub Settings',
        details: 'Enable Dependabot to automatically fix security vulnerabilities'
      });
    }
  }
}

async function fetchFileContent(repoName: string, path: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/contents/${path}`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'RepoScan-App'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.content && data.size < 500000) {
      return atob(data.content.replace(/\n/g, ''));
    }
    return null;
  } catch (error) {
    return null;
  }
}
