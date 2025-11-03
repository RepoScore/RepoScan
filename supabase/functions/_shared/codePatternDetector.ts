import { Vulnerability } from './vulnerabilityScanner.ts';

export async function detectCodePatterns(
  repoName: string,
  contents: any[]
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];

  const codeFiles = contents.filter(f =>
    isCodeFile(f.name) && f.type === 'file' && f.size < 1000000
  );

  for (const file of codeFiles.slice(0, 20)) {
    try {
      const content = await fetchFileContent(repoName, file.path || file.name);
      if (content) {
        vulnerabilities.push(...analyzeCodePatterns(content, file.name));
      }
    } catch (error) {
      console.error(`Error analyzing ${file.name}:`, error);
    }
  }

  return vulnerabilities;
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

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.go', '.java',
    '.c', '.cpp', '.cs', '.php', '.rb', '.swift', '.kt'
  ];
  return codeExtensions.some(ext => filename.endsWith(ext));
}

function analyzeCodePatterns(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  vulnerabilities.push(...detectHardcodedSecrets(content, filename));
  vulnerabilities.push(...detectInsecurePatterns(content, filename));
  vulnerabilities.push(...detectDangerousFunctions(content, filename));
  vulnerabilities.push(...detectCommandInjection(content, filename));
  vulnerabilities.push(...detectSQLInjection(content, filename));

  return vulnerabilities;
}

function detectHardcodedSecrets(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const secretPatterns = [
    {
      pattern: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
      description: 'Potential hardcoded API key',
      severity: 'critical' as const
    },
    {
      pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/gi,
      description: 'Potential hardcoded password',
      severity: 'critical' as const
    },
    {
      pattern: /(?:private[_-]?key|privatekey)\s*[=:]\s*['"]([^'"]{20,})['"]/gi,
      description: 'Potential hardcoded private key',
      severity: 'critical' as const
    },
    {
      pattern: /(?:secret[_-]?key|secretkey)\s*[=:]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
      description: 'Potential hardcoded secret key',
      severity: 'critical' as const
    },
    {
      pattern: /(?:aws[_-]?access[_-]?key[_-]?id)\s*[=:]\s*['"]([A-Z0-9]{20})['"]/gi,
      description: 'Potential AWS access key',
      severity: 'critical' as const
    },
    {
      pattern: /(?:github[_-]?token|gh[_-]?token)\s*[=:]\s*['"]([a-zA-Z0-9_]{40})['"]/gi,
      description: 'Potential GitHub token',
      severity: 'critical' as const
    }
  ];

  for (const { pattern, description, severity } of secretPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = getLineNumber(content, match.index || 0);
      vulnerabilities.push({
        severity,
        type: 'code_pattern',
        description,
        location: `${filename}:${lineNumber}`,
        details: 'Hardcoded credentials should be moved to environment variables'
      });
    }
  }

  return vulnerabilities;
}

function detectInsecurePatterns(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const insecurePatterns = [
    {
      pattern: /eval\s*\(/gi,
      description: 'Use of eval() function',
      severity: 'high' as const,
      details: 'eval() can execute arbitrary code and is a major security risk'
    },
    {
      pattern: /new\s+Function\s*\(/gi,
      description: 'Dynamic code execution via Function constructor',
      severity: 'high' as const,
      details: 'Function constructor can execute arbitrary code'
    },
    {
      pattern: /innerHTML\s*=/gi,
      description: 'Direct innerHTML assignment',
      severity: 'medium' as const,
      details: 'innerHTML can introduce XSS vulnerabilities. Consider using textContent or sanitization'
    },
    {
      pattern: /dangerouslySetInnerHTML/gi,
      description: 'React dangerouslySetInnerHTML usage',
      severity: 'medium' as const,
      details: 'Ensure content is properly sanitized before using dangerouslySetInnerHTML'
    },
    {
      pattern: /crypto\.createHash\s*\(\s*['"]md5['"]\s*\)/gi,
      description: 'Use of insecure MD5 hash',
      severity: 'medium' as const,
      details: 'MD5 is cryptographically broken. Use SHA-256 or stronger'
    }
  ];

  for (const { pattern, description, severity, details } of insecurePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = getLineNumber(content, match.index || 0);
      vulnerabilities.push({
        severity,
        type: 'code_pattern',
        description,
        location: `${filename}:${lineNumber}`,
        details
      });
    }
  }

  return vulnerabilities;
}

function detectDangerousFunctions(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const dangerousPatterns = [
    {
      pattern: /child_process\.exec\s*\(/gi,
      description: 'Use of child_process.exec()',
      severity: 'high' as const,
      details: 'exec() can lead to command injection. Use execFile() with arguments array instead'
    },
    {
      pattern: /os\.system\s*\(/gi,
      description: 'Use of os.system() in Python',
      severity: 'high' as const,
      details: 'os.system() is vulnerable to command injection. Use subprocess.run() instead'
    },
    {
      pattern: /pickle\.loads?\s*\(/gi,
      description: 'Use of pickle.load/loads in Python',
      severity: 'high' as const,
      details: 'Pickle can execute arbitrary code. Avoid unpickling untrusted data'
    },
    {
      pattern: /unsafe\s*{/gi,
      description: 'Unsafe code block in Rust',
      severity: 'medium' as const,
      details: 'Unsafe blocks bypass memory safety guarantees. Ensure proper validation'
    }
  ];

  for (const { pattern, description, severity, details } of dangerousPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = getLineNumber(content, match.index || 0);
      vulnerabilities.push({
        severity,
        type: 'code_pattern',
        description,
        location: `${filename}:${lineNumber}`,
        details
      });
    }
  }

  return vulnerabilities;
}

function detectCommandInjection(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const commandInjectionPatterns = [
    /shell\s*=\s*True/gi,
    /exec\s*\([^)]*\+[^)]*\)/gi,
    /system\s*\([^)]*\+[^)]*\)/gi,
    /Process\s*\([^)]*\+[^)]*\)/gi
  ];

  for (const pattern of commandInjectionPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = getLineNumber(content, match.index || 0);
      vulnerabilities.push({
        severity: 'high',
        type: 'code_pattern',
        description: 'Potential command injection vulnerability',
        location: `${filename}:${lineNumber}`,
        details: 'User input appears to be concatenated into shell command. Use parameterized execution'
      });
    }
  }

  return vulnerabilities;
}

function detectSQLInjection(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const sqlInjectionPatterns = [
    /execute\s*\(\s*['"][^'"]*\+/gi,
    /query\s*\(\s*['"][^'"]*\+/gi,
    /raw\s*\(\s*['"][^'"]*\+/gi,
    /SELECT\s+.*\s+FROM\s+.*\+/gi
  ];

  for (const pattern of sqlInjectionPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = getLineNumber(content, match.index || 0);
      vulnerabilities.push({
        severity: 'critical',
        type: 'code_pattern',
        description: 'Potential SQL injection vulnerability',
        location: `${filename}:${lineNumber}`,
        details: 'SQL query appears to use string concatenation. Use parameterized queries instead'
      });
    }
  }

  return vulnerabilities;
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}
