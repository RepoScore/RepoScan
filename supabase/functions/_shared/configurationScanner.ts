import { Vulnerability } from './vulnerabilityScanner.ts';

export async function scanConfigurationVulnerabilities(
  repoName: string,
  contents: any[]
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];

  await Promise.all([
    scanEnvFiles(repoName, contents, vulnerabilities),
    scanDockerfiles(repoName, contents, vulnerabilities),
    scanCICD(repoName, contents, vulnerabilities),
    scanWebServerConfigs(repoName, contents, vulnerabilities),
  ]);

  return vulnerabilities;
}

async function scanEnvFiles(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const envFile = contents.find(f => f.name === '.env');

  if (envFile) {
    vulnerabilities.push({
      severity: 'critical',
      type: 'configuration',
      description: 'Environment file (.env) committed to repository',
      location: '.env',
      details: 'This file may contain sensitive credentials. Remove it and use .env.example instead'
    });

    try {
      const content = await fetchFileContent(repoName, '.env');
      if (content) {
        const secretPatterns = [
          { pattern: /password|passwd|pwd/i, name: 'password' },
          { pattern: /api[_-]?key|apikey/i, name: 'API key' },
          { pattern: /secret/i, name: 'secret' },
          { pattern: /token/i, name: 'token' },
          { pattern: /aws[_-]?access/i, name: 'AWS credential' },
        ];

        for (const { pattern, name } of secretPatterns) {
          if (pattern.test(content)) {
            vulnerabilities.push({
              severity: 'critical',
              type: 'configuration',
              description: `Potential ${name} exposed in .env file`,
              location: '.env',
              details: `Found ${name} reference in committed .env file`
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scanning .env:', error);
    }
  }

  const configFiles = contents.filter(f =>
    f.name.match(/config\.(js|ts|json|yml|yaml)$/) && !f.name.includes('test')
  );

  for (const file of configFiles) {
    try {
      const content = await fetchFileContent(repoName, file.path || file.name);
      if (content) {
        const hardcodedSecrets = [
          /['"]?(?:api[_-]?key|apikey)['"]?\s*[:=]\s*['"]\w{20,}['"]/gi,
          /['"]?password['"]?\s*[:=]\s*['"]\w+['"]/gi,
          /['"]?secret['"]?\s*[:=]\s*['"]\w{20,}['"]/gi,
        ];

        for (const pattern of hardcodedSecrets) {
          if (pattern.test(content)) {
            vulnerabilities.push({
              severity: 'high',
              type: 'configuration',
              description: 'Hardcoded credential in configuration file',
              location: file.name,
              details: 'Configuration contains hardcoded secrets. Use environment variables'
            });
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${file.name}:`, error);
    }
  }
}

async function scanDockerfiles(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const dockerfiles = contents.filter(f =>
    f.name.toLowerCase().includes('dockerfile')
  );

  for (const dockerfile of dockerfiles) {
    try {
      const content = await fetchFileContent(repoName, dockerfile.path || dockerfile.name);
      if (!content) continue;

      if (/FROM\s+.*:latest/i.test(content)) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Docker image using :latest tag',
          location: dockerfile.name,
          details: 'Pin specific image versions for reproducible builds'
        });
      }

      if (/USER\s+root/i.test(content) && !/USER\s+(?!root)/i.test(content)) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Dockerfile runs as root user',
          location: dockerfile.name,
          details: 'Create and use a non-root user for better security'
        });
      }

      if (/ADD\s+http/i.test(content)) {
        vulnerabilities.push({
          severity: 'low',
          type: 'configuration',
          description: 'Dockerfile uses ADD with URLs',
          location: dockerfile.name,
          details: 'Use COPY or RUN with curl/wget for better control'
        });
      }

      const secretsInBuild = [
        /ARG\s+.*(?:password|secret|token|key)/i,
        /ENV\s+.*(?:password|secret|token|key)\s*=\s*\w+/i,
      ];

      for (const pattern of secretsInBuild) {
        if (pattern.test(content)) {
          vulnerabilities.push({
            severity: 'high',
            type: 'configuration',
            description: 'Potential secrets in Dockerfile',
            location: dockerfile.name,
            details: 'Avoid hardcoding secrets in Dockerfile. Use build secrets or runtime environment'
          });
          break;
        }
      }
    } catch (error) {
      console.error(`Error scanning ${dockerfile.name}:`, error);
    }
  }
}

async function scanCICD(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const workflowFiles = contents.filter(f =>
    f.path && f.path.includes('.github/workflows/')
  );

  for (const workflow of workflowFiles) {
    try {
      const content = await fetchFileContent(repoName, workflow.path);
      if (!content) continue;

      if (/\$\{\{\s*github\.event\./i.test(content)) {
        vulnerabilities.push({
          severity: 'high',
          type: 'configuration',
          description: 'Potential script injection in GitHub Actions',
          location: workflow.path,
          details: 'Using github.event context in run commands can allow code injection'
        });
      }

      if (/pull_request_target/i.test(content) && /checkout/i.test(content)) {
        vulnerabilities.push({
          severity: 'high',
          type: 'configuration',
          description: 'Unsafe pull_request_target with checkout',
          location: workflow.path,
          details: 'pull_request_target with checkout can execute untrusted code'
        });
      }

      if (/GITHUB_TOKEN.*echo/i.test(content)) {
        vulnerabilities.push({
          severity: 'critical',
          type: 'configuration',
          description: 'GITHUB_TOKEN potentially exposed in logs',
          location: workflow.path,
          details: 'Never echo or log GITHUB_TOKEN'
        });
      }

      if (!/permissions:/i.test(content)) {
        vulnerabilities.push({
          severity: 'low',
          type: 'configuration',
          description: 'No explicit permissions in GitHub Actions workflow',
          location: workflow.path,
          details: 'Define explicit permissions to follow principle of least privilege'
        });
      }
    } catch (error) {
      console.error(`Error scanning ${workflow.path}:`, error);
    }
  }

  const gitlabCI = contents.find(f => f.name === '.gitlab-ci.yml');
  if (gitlabCI) {
    try {
      const content = await fetchFileContent(repoName, '.gitlab-ci.yml');
      if (content && /script:.*\$\{?[A-Z_]+/i.test(content)) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Environment variables used directly in GitLab CI scripts',
          location: '.gitlab-ci.yml',
          details: 'Validate and sanitize environment variables before use'
        });
      }
    } catch (error) {
      console.error('Error scanning .gitlab-ci.yml:', error);
    }
  }
}

async function scanWebServerConfigs(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const nginxConfigs = contents.filter(f =>
    f.name.includes('nginx') && f.name.match(/\.conf$/)
  );

  for (const config of nginxConfigs) {
    try {
      const content = await fetchFileContent(repoName, config.path || config.name);
      if (!content) continue;

      if (!/add_header\s+X-Frame-Options/i.test(content)) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Missing X-Frame-Options header in nginx config',
          location: config.name,
          details: 'Add X-Frame-Options header to prevent clickjacking'
        });
      }

      if (/server_tokens\s+on/i.test(content)) {
        vulnerabilities.push({
          severity: 'low',
          type: 'configuration',
          description: 'Nginx server tokens enabled',
          location: config.name,
          details: 'Set server_tokens off to hide version information'
        });
      }
    } catch (error) {
      console.error(`Error scanning ${config.name}:`, error);
    }
  }

  const expressFiles = contents.filter(f =>
    (f.name.includes('server') || f.name.includes('app')) &&
    f.name.match(/\.(js|ts)$/)
  );

  for (const file of expressFiles.slice(0, 5)) {
    try {
      const content = await fetchFileContent(repoName, file.path || file.name);
      if (!content) continue;

      if (/cors\s*\(\s*\{[\s\S]*origin:\s*['"]?\*['"]?/i.test(content)) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'configuration',
          description: 'Overly permissive CORS configuration',
          location: file.name,
          details: 'CORS allows all origins (*). Restrict to specific domains'
        });
      }

      if (/express\(\)/ && !/helmet\(\)/i.test(content)) {
        vulnerabilities.push({
          severity: 'low',
          type: 'configuration',
          description: 'Express app without helmet security headers',
          location: file.name,
          details: 'Consider using helmet middleware for security headers'
        });
      }
    } catch (error) {
      console.error(`Error scanning ${file.name}:`, error);
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
