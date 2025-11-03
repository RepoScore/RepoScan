import { Vulnerability } from './vulnerabilityScanner.ts';

export async function detectAdvancedPatterns(
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
        vulnerabilities.push(...detectCryptoIssues(content, file.name));
        vulnerabilities.push(...detectRaceConditions(content, file.name));
        vulnerabilities.push(...detectMemorySafety(content, file.name));
        vulnerabilities.push(...detectDeserializationIssues(content, file.name));
        vulnerabilities.push(...detectPathTraversal(content, file.name));
        vulnerabilities.push(...detectXXE(content, file.name));
        vulnerabilities.push(...detectSSRF(content, file.name));
      }
    } catch (error) {
      console.error(`Error analyzing ${file.name}:`, error);
    }
  }

  return vulnerabilities;
}

function detectCryptoIssues(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const weakCrypto = [
    {
      pattern: /crypto\.createCipher\s*\(\s*['"]des['"]/gi,
      description: 'Weak DES encryption algorithm',
      severity: 'high' as const,
    },
    {
      pattern: /crypto\.createHash\s*\(\s*['"]md5['"]/gi,
      description: 'Weak MD5 hash algorithm',
      severity: 'medium' as const,
    },
    {
      pattern: /crypto\.createHash\s*\(\s*['"]sha1['"]/gi,
      description: 'Weak SHA-1 hash algorithm',
      severity: 'medium' as const,
    },
    {
      pattern: /Cipher\.getInstance\s*\(\s*['"]DES/gi,
      description: 'Weak DES encryption in Java',
      severity: 'high' as const,
    },
    {
      pattern: /new\s+Random\s*\(\s*\)/gi,
      description: 'Insecure Random number generator',
      severity: 'medium' as const,
    },
    {
      pattern: /Math\.random\s*\(\s*\)/g,
      description: 'Math.random() not cryptographically secure',
      severity: 'medium' as const,
    },
  ];

  for (const { pattern, description, severity } of weakCrypto) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = getLineNumber(content, match.index || 0);
      vulnerabilities.push({
        severity,
        type: 'code_pattern',
        description,
        location: `${filename}:${lineNumber}`,
        details: 'Use modern, secure cryptographic algorithms'
      });
    }
  }

  const hardcodedKeys = [
    /(?:aes[_-]?key|encryption[_-]?key)\s*=\s*['"]\w{16,}['"]/gi,
    /(?:secret[_-]?key|private[_-]?key)\s*=\s*['"]\w{32,}['"]/gi,
  ];

  for (const pattern of hardcodedKeys) {
    if (pattern.test(content)) {
      vulnerabilities.push({
        severity: 'critical',
        type: 'code_pattern',
        description: 'Hardcoded encryption key',
        location: filename,
        details: 'Encryption keys should be stored securely, not hardcoded'
      });
    }
  }

  return vulnerabilities;
}

function detectRaceConditions(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const racePatterns = [
    {
      pattern: /if\s*\([^)]*\.exists?\([^)]*\)\s*\)\s*{[^}]*(?:open|create|write)/gi,
      description: 'Time-of-check to time-of-use (TOCTOU) race condition',
      severity: 'high' as const,
    },
    {
      pattern: /os\.path\.exists[^;]*\n[^;]*open/gi,
      description: 'Potential TOCTOU in file operations',
      severity: 'high' as const,
    },
  ];

  for (const { pattern, description, severity } of racePatterns) {
    if (pattern.test(content)) {
      vulnerabilities.push({
        severity,
        type: 'code_pattern',
        description,
        location: filename,
        details: 'Check-then-act pattern can lead to race conditions'
      });
    }
  }

  if (filename.match(/\.(go|rs|cpp|c)$/) && /(?:^|\s)(?:static|global)\s+.*=/.test(content)) {
    if (!/(?:mutex|lock|atomic)/i.test(content)) {
      vulnerabilities.push({
        severity: 'medium',
        type: 'code_pattern',
        description: 'Global variable without synchronization',
        location: filename,
        details: 'Global state without proper synchronization can cause race conditions'
      });
    }
  }

  return vulnerabilities;
}

function detectMemorySafety(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  if (filename.match(/\.(c|cpp)$/)) {
    const unsafeFunctions = [
      { func: 'strcpy', msg: 'Use strncpy or strlcpy instead' },
      { func: 'strcat', msg: 'Use strncat or strlcat instead' },
      { func: 'sprintf', msg: 'Use snprintf instead' },
      { func: 'gets', msg: 'Use fgets instead' },
      { func: 'scanf', msg: 'Validate input and use bounds checking' },
    ];

    for (const { func, msg } of unsafeFunctions) {
      const pattern = new RegExp(`\\b${func}\\s*\\(`, 'g');
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = getLineNumber(content, match.index || 0);
        vulnerabilities.push({
          severity: 'high',
          type: 'code_pattern',
          description: `Unsafe function: ${func}()`,
          location: `${filename}:${lineNumber}`,
          details: msg
        });
      }
    }

    if (/malloc\s*\([^)]*\)(?!\s*;)(?![^;]*free\s*\()/g.test(content)) {
      vulnerabilities.push({
        severity: 'medium',
        type: 'code_pattern',
        description: 'Potential memory leak',
        location: filename,
        details: 'Allocated memory may not be freed'
      });
    }
  }

  if (filename.match(/\.rs$/)) {
    const unsafeBlocks = content.match(/unsafe\s*\{/g);
    if (unsafeBlocks && unsafeBlocks.length > 5) {
      vulnerabilities.push({
        severity: 'medium',
        type: 'code_pattern',
        description: `Excessive unsafe blocks (${unsafeBlocks.length})`,
        location: filename,
        details: 'High number of unsafe blocks may indicate unsafe memory practices'
      });
    }
  }

  return vulnerabilities;
}

function detectDeserializationIssues(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const dangerousDeserializers = [
    {
      pattern: /pickle\.loads?\s*\(/gi,
      lang: 'Python',
      details: 'pickle can execute arbitrary code during deserialization'
    },
    {
      pattern: /yaml\.load\s*\([^,)]*\)(?!\s*,\s*Loader\s*=)/gi,
      lang: 'Python',
      details: 'Use yaml.safe_load() instead of yaml.load()'
    },
    {
      pattern: /JSON\.parse\s*\([^)]*\)[^;]*eval/gi,
      lang: 'JavaScript',
      details: 'Deserializing and evaluating JSON can execute arbitrary code'
    },
    {
      pattern: /ObjectInputStream\s*\([^)]*\)\.readObject/gi,
      lang: 'Java',
      details: 'Java deserialization can lead to remote code execution'
    },
    {
      pattern: /unserialize\s*\(/gi,
      lang: 'PHP',
      details: 'PHP unserialize() vulnerable to object injection'
    },
  ];

  for (const { pattern, lang, details } of dangerousDeserializers) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const lineNumber = getLineNumber(content, match.index || 0);
      vulnerabilities.push({
        severity: 'critical',
        type: 'code_pattern',
        description: `Unsafe deserialization in ${lang}`,
        location: `${filename}:${lineNumber}`,
        details
      });
    }
  }

  return vulnerabilities;
}

function detectPathTraversal(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const pathTraversalPatterns = [
    /(?:open|read|write).*\(.*(?:req\.query|req\.params|request\.args).*\+.*['"]\//gi,
    /fs\.readFile.*\(.*(?:req\.|request\.).*\)/gi,
    /path\.join\s*\([^)]*(?:req\.|request\.)/gi,
  ];

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(content)) {
      vulnerabilities.push({
        severity: 'high',
        type: 'code_pattern',
        description: 'Potential path traversal vulnerability',
        location: filename,
        details: 'User input used in file paths without validation. Sanitize and validate paths'
      });
      break;
    }
  }

  return vulnerabilities;
}

function detectXXE(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const xxePatterns = [
    /XMLParser\s*\([^)]*\)(?![^;]*resolve_entities\s*=\s*False)/gi,
    /DocumentBuilder(?![^;]*setFeature[^;]*"http:\/\/xml\.org\/sax\/features\/external-general-entities"[^;]*false)/gi,
    /SAXParser(?![^;]*setFeature[^;]*external)/gi,
  ];

  for (const pattern of xxePatterns) {
    if (pattern.test(content)) {
      vulnerabilities.push({
        severity: 'high',
        type: 'code_pattern',
        description: 'XML External Entity (XXE) vulnerability',
        location: filename,
        details: 'XML parser may be vulnerable to XXE attacks. Disable external entity resolution'
      });
      break;
    }
  }

  return vulnerabilities;
}

function detectSSRF(content: string, filename: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];

  const ssrfPatterns = [
    /(?:fetch|axios|request)\s*\([^)]*(?:req\.|request\.|params\.|query\.)/gi,
    /urllib\.request\.urlopen\s*\([^)]*(?:request\.|args\.|form\.)/gi,
    /HttpClient.*\.get\s*\([^)]*(?:request\.|params\.)/gi,
  ];

  for (const pattern of ssrfPatterns) {
    if (pattern.test(content)) {
      vulnerabilities.push({
        severity: 'high',
        type: 'code_pattern',
        description: 'Potential Server-Side Request Forgery (SSRF)',
        location: filename,
        details: 'User-controlled URLs can lead to SSRF. Validate and whitelist URLs'
      });
      break;
    }
  }

  return vulnerabilities;
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.go', '.java',
    '.c', '.cpp', '.cs', '.php', '.rb', '.swift', '.kt'
  ];
  return codeExtensions.some(ext => filename.endsWith(ext));
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
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
