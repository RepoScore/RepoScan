import { Vulnerability } from './vulnerabilityScanner.ts';

export async function scanSupplyChain(
  repoName: string,
  contents: any[]
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];

  await Promise.all([
    checkTyposquatting(repoName, contents, vulnerabilities),
    checkDeprecatedPackages(repoName, contents, vulnerabilities),
    checkLicenseConflicts(repoName, contents, vulnerabilities),
    checkDependencyDepth(repoName, contents, vulnerabilities),
  ]);

  return vulnerabilities;
}

async function checkTyposquatting(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const packageJson = contents.find(f => f.name === 'package.json');
  if (!packageJson) return;

  try {
    const content = await fetchFileContent(repoName, 'package.json');
    if (!content) return;

    const pkg = JSON.parse(content);
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const popularPackages = {
      'react': ['react', 'reactjs', 'react-js', 'react.js'],
      'lodash': ['lodash', 'lodash-es', 'lodash.js', 'loadash'],
      'axios': ['axios', 'axois', 'axiom'],
      'express': ['express', 'expresss', 'exress'],
      'webpack': ['webpack', 'webpak', 'web-pack'],
      'typescript': ['typescript', 'typscript', 'type-script'],
    };

    const suspiciousPatterns = [
      /^@[a-z0-9-]+\/[a-z0-9-]+-official$/,
      /^[a-z]+-utils?$/,
      /^[a-z]+-helper$/,
      /^@types\/[a-z]+-types$/,
    ];

    for (const [depName, version] of Object.entries(allDeps)) {
      const depNameLower = depName.toLowerCase();

      for (const [legit, variants] of Object.entries(popularPackages)) {
        const isSuspicious = variants.some(v => {
          if (v === legit) return false;
          if (depNameLower === legit) return false;
          if (depNameLower === v) return false;
          return levenshteinDistance(depNameLower, v) <= 1;
        });

        if (isSuspicious) {
          vulnerabilities.push({
            severity: 'critical',
            type: 'dependency',
            description: `Potential typosquatting: ${depName} looks similar to ${legit}`,
            location: 'package.json',
            details: 'This package name is suspiciously similar to a popular package'
          });
          break;
        }
      }

      if (suspiciousPatterns.some(p => p.test(depName))) {
        vulnerabilities.push({
          severity: 'medium',
          type: 'dependency',
          description: `Suspicious package naming pattern: ${depName}`,
          location: 'package.json',
          details: 'Package name follows common typosquatting patterns'
        });
      }
    }
  } catch (error) {
    console.error('Error checking typosquatting:', error);
  }
}

async function checkDeprecatedPackages(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const knownDeprecated = {
    npm: [
      'request', 'node-uuid', 'babel-preset-es2015', 'babel-preset-es2016',
      'babel-preset-es2017', 'gulp-util', 'natives', 'coffeescript',
      'babel-preset-stage-0', 'babel-preset-stage-1', 'babel-preset-stage-2',
      'babel-preset-stage-3', 'core-js@2'
    ],
    python: [
      'pycrypto', 'python-oauth2', 'django-guardian', 'nose',
      'optparse', 'imp'
    ],
  };

  const packageJson = contents.find(f => f.name === 'package.json');
  if (packageJson) {
    try {
      const content = await fetchFileContent(repoName, 'package.json');
      if (content) {
        const pkg = JSON.parse(content);
        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };

        for (const [depName, version] of Object.entries(allDeps)) {
          if (knownDeprecated.npm.includes(depName)) {
            vulnerabilities.push({
              severity: 'high',
              type: 'dependency',
              description: `Deprecated npm package: ${depName}`,
              location: 'package.json',
              details: 'This package is no longer maintained. Find an alternative'
            });
          }

          if (typeof version === 'string' && version.startsWith('github:')) {
            vulnerabilities.push({
              severity: 'medium',
              type: 'dependency',
              description: `GitHub dependency: ${depName}`,
              location: 'package.json',
              details: 'Direct GitHub dependencies can pose security and stability risks'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking deprecated npm packages:', error);
    }
  }

  const requirementsTxt = contents.find(f => f.name === 'requirements.txt');
  if (requirementsTxt) {
    try {
      const content = await fetchFileContent(repoName, 'requirements.txt');
      if (content) {
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.trim().match(/^([a-zA-Z0-9-_.]+)/);
          if (match) {
            const pkgName = match[1].toLowerCase();
            if (knownDeprecated.python.includes(pkgName)) {
              vulnerabilities.push({
                severity: 'high',
                type: 'dependency',
                description: `Deprecated Python package: ${pkgName}`,
                location: 'requirements.txt',
                details: 'This package is no longer maintained. Find an alternative'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking deprecated Python packages:', error);
    }
  }
}

async function checkLicenseConflicts(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const packageJson = contents.find(f => f.name === 'package.json');
  if (!packageJson) return;

  try {
    const content = await fetchFileContent(repoName, 'package.json');
    if (!content) return;

    const pkg = JSON.parse(content);
    const projectLicense = pkg.license;

    if (!projectLicense) return;

    const copyleftLicenses = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL'];
    const permissiveLicenses = ['MIT', 'Apache-2.0', 'BSD', 'ISC'];

    const isProjectCopyleft = copyleftLicenses.some(l =>
      projectLicense.includes(l)
    );
    const isProjectPermissive = permissiveLicenses.some(l =>
      projectLicense.includes(l)
    );

    const problematicDeps = [];
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    for (const depName of Object.keys(allDeps)) {
      if (isProjectPermissive) {
        if (copyleftLicenses.some(l => depName.toLowerCase().includes('gpl'))) {
          problematicDeps.push(depName);
        }
      }
    }

    if (problematicDeps.length > 0) {
      vulnerabilities.push({
        severity: 'medium',
        type: 'dependency',
        description: 'Potential license conflict detected',
        location: 'package.json',
        details: `Project uses ${projectLicense} but may have GPL dependencies. Review: ${problematicDeps.join(', ')}`
      });
    }
  } catch (error) {
    console.error('Error checking license conflicts:', error);
  }
}

async function checkDependencyDepth(
  repoName: string,
  contents: any[],
  vulnerabilities: Vulnerability[]
): Promise<void> {
  const packageJson = contents.find(f => f.name === 'package.json');
  if (!packageJson) return;

  try {
    const content = await fetchFileContent(repoName, 'package.json');
    if (!content) return;

    const pkg = JSON.parse(content);
    const depCount = Object.keys(pkg.dependencies || {}).length;
    const devDepCount = Object.keys(pkg.devDependencies || {}).length;
    const totalDeps = depCount + devDepCount;

    if (totalDeps > 100) {
      vulnerabilities.push({
        severity: 'low',
        type: 'dependency',
        description: `High dependency count: ${totalDeps} packages`,
        location: 'package.json',
        details: 'Large dependency trees increase attack surface. Consider reducing dependencies'
      });
    }

    if (depCount > 50 && devDepCount === 0) {
      vulnerabilities.push({
        severity: 'low',
        type: 'dependency',
        description: 'No devDependencies separation',
        location: 'package.json',
        details: 'Consider moving build/test dependencies to devDependencies'
      });
    }

    const peerDeps = pkg.peerDependencies || {};
    const missingPeers = Object.keys(peerDeps).filter(
      peer => !pkg.dependencies?.[peer] && !pkg.devDependencies?.[peer]
    );

    if (missingPeers.length > 0) {
      vulnerabilities.push({
        severity: 'medium',
        type: 'dependency',
        description: 'Missing peer dependencies',
        location: 'package.json',
        details: `Peer dependencies not installed: ${missingPeers.join(', ')}`
      });
    }
  } catch (error) {
    console.error('Error checking dependency depth:', error);
  }
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
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
