export interface CodeQualityMetrics {
  total_files_analyzed: number;
  avg_file_size: number;
  avg_complexity: number;
  code_duplication_risk: number;
  comment_ratio: number;
  large_files_count: number;
  quality_score: number;
  issues: string[];
}

export async function analyzeCodeQuality(
  repoName: string,
  contents: any[]
): Promise<CodeQualityMetrics> {
  const codeFiles = contents.filter(f =>
    isCodeFile(f.name) && f.type === 'file' && f.size < 1000000
  );

  const metrics: CodeQualityMetrics = {
    total_files_analyzed: 0,
    avg_file_size: 0,
    avg_complexity: 0,
    code_duplication_risk: 0,
    comment_ratio: 0,
    large_files_count: 0,
    quality_score: 0,
    issues: [],
  };

  if (codeFiles.length === 0) {
    metrics.quality_score = 50;
    metrics.issues.push('No code files found to analyze');
    return metrics;
  }

  const filesToAnalyze = codeFiles.slice(0, 30);
  const fileMetrics: any[] = [];

  for (const file of filesToAnalyze) {
    try {
      const content = await fetchFileContent(repoName, file.path || file.name);
      if (content) {
        const fileMetric = analyzeFile(content, file.name, file.size);
        fileMetrics.push(fileMetric);
      }
    } catch (error) {
      console.error(`Error analyzing ${file.name}:`, error);
    }
  }

  if (fileMetrics.length === 0) {
    metrics.quality_score = 50;
    metrics.issues.push('Unable to analyze any files');
    return metrics;
  }

  metrics.total_files_analyzed = fileMetrics.length;
  metrics.avg_file_size = Math.round(
    fileMetrics.reduce((sum, m) => sum + m.size, 0) / fileMetrics.length
  );
  metrics.avg_complexity = Math.round(
    fileMetrics.reduce((sum, m) => sum + m.complexity, 0) / fileMetrics.length
  );
  metrics.comment_ratio = Number(
    (fileMetrics.reduce((sum, m) => sum + m.comment_ratio, 0) / fileMetrics.length).toFixed(2)
  );
  metrics.large_files_count = fileMetrics.filter(m => m.size > 50000).length;

  const duplicateRisk = calculateDuplicationRisk(fileMetrics);
  metrics.code_duplication_risk = duplicateRisk;

  metrics.quality_score = calculateQualityScore(metrics);

  if (metrics.avg_complexity > 15) {
    metrics.issues.push(`High average cyclomatic complexity: ${metrics.avg_complexity}`);
  }

  if (metrics.comment_ratio < 0.05) {
    metrics.issues.push(`Low comment ratio: ${(metrics.comment_ratio * 100).toFixed(1)}%`);
  }

  if (metrics.large_files_count > 5) {
    metrics.issues.push(`${metrics.large_files_count} files exceed 50KB`);
  }

  if (metrics.avg_file_size > 30000) {
    metrics.issues.push(`Large average file size: ${(metrics.avg_file_size / 1000).toFixed(1)}KB`);
  }

  if (duplicateRisk > 30) {
    metrics.issues.push(`High code duplication risk: ${duplicateRisk}%`);
  }

  return metrics;
}

function analyzeFile(content: string, filename: string, size: number): any {
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  const commentLines = countCommentLines(content, filename);
  const codeLines = nonEmptyLines.length - commentLines;
  const comment_ratio = codeLines > 0 ? commentLines / codeLines : 0;

  const complexity = calculateCyclomaticComplexity(content, filename);

  return {
    filename,
    size,
    lines: lines.length,
    code_lines: codeLines,
    comment_lines: commentLines,
    comment_ratio,
    complexity,
  };
}

function countCommentLines(content: string, filename: string): number {
  let commentLines = 0;

  if (filename.match(/\.(js|ts|jsx|tsx|java|c|cpp|cs|go|rs|swift|kt)$/)) {
    const singleLineComments = content.match(/^\s*\/\/.*/gm);
    commentLines += singleLineComments ? singleLineComments.length : 0;

    const multiLineComments = content.match(/\/\*[\s\S]*?\*\//g);
    if (multiLineComments) {
      for (const comment of multiLineComments) {
        commentLines += comment.split('\n').length;
      }
    }
  } else if (filename.match(/\.py$/)) {
    const singleLineComments = content.match(/^\s*#.*/gm);
    commentLines += singleLineComments ? singleLineComments.length : 0;

    const docstrings = content.match(/['"]{3}[\s\S]*?['"]{3}/g);
    if (docstrings) {
      for (const docstring of docstrings) {
        commentLines += docstring.split('\n').length;
      }
    }
  } else if (filename.match(/\.rb$/)) {
    const singleLineComments = content.match(/^\s*#.*/gm);
    commentLines += singleLineComments ? singleLineComments.length : 0;
  }

  return commentLines;
}

function calculateCyclomaticComplexity(content: string, filename: string): number {
  let complexity = 1;

  const controlFlowPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*.*\s*:/g,
    /&&/g,
    /\|\|/g,
  ];

  for (const pattern of controlFlowPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  if (filename.match(/\.py$/)) {
    const pythonPatterns = [
      /\belif\s+/g,
      /\bexcept\s+/g,
      /\bfor\s+\w+\s+in\s+/g,
    ];

    for (const pattern of pythonPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
  }

  return complexity;
}

function calculateDuplicationRisk(fileMetrics: any[]): number {
  if (fileMetrics.length < 2) return 0;

  const avgSize = fileMetrics.reduce((sum, m) => sum + m.size, 0) / fileMetrics.length;
  const avgComplexity = fileMetrics.reduce((sum, m) => sum + m.complexity, 0) / fileMetrics.length;

  const similarSizeCount = fileMetrics.filter(m =>
    Math.abs(m.size - avgSize) < avgSize * 0.1
  ).length;

  const similarComplexityCount = fileMetrics.filter(m =>
    Math.abs(m.complexity - avgComplexity) < 3
  ).length;

  const sizeRisk = (similarSizeCount / fileMetrics.length) * 40;
  const complexityRisk = (similarComplexityCount / fileMetrics.length) * 30;

  const fileNames = fileMetrics.map(m => m.filename.toLowerCase());
  const similarNames = new Set();
  for (let i = 0; i < fileNames.length; i++) {
    for (let j = i + 1; j < fileNames.length; j++) {
      const name1 = fileNames[i].replace(/\.(js|ts|jsx|tsx|py|rb|java)$/, '');
      const name2 = fileNames[j].replace(/\.(js|ts|jsx|tsx|py|rb|java)$/, '');
      if (name1.includes(name2) || name2.includes(name1)) {
        similarNames.add(fileNames[i]);
        similarNames.add(fileNames[j]);
      }
    }
  }
  const nameRisk = (similarNames.size / fileMetrics.length) * 30;

  return Math.round(sizeRisk + complexityRisk + nameRisk);
}

function calculateQualityScore(metrics: CodeQualityMetrics): number {
  let score = 100;

  if (metrics.avg_complexity > 20) {
    score -= 30;
  } else if (metrics.avg_complexity > 15) {
    score -= 20;
  } else if (metrics.avg_complexity > 10) {
    score -= 10;
  }

  if (metrics.comment_ratio < 0.05) {
    score -= 20;
  } else if (metrics.comment_ratio < 0.10) {
    score -= 10;
  } else if (metrics.comment_ratio > 0.20) {
    score += 10;
  }

  if (metrics.large_files_count > 10) {
    score -= 20;
  } else if (metrics.large_files_count > 5) {
    score -= 10;
  }

  if (metrics.avg_file_size > 50000) {
    score -= 15;
  } else if (metrics.avg_file_size > 30000) {
    score -= 10;
  }

  if (metrics.code_duplication_risk > 40) {
    score -= 20;
  } else if (metrics.code_duplication_risk > 30) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.go', '.java',
    '.c', '.cpp', '.cs', '.php', '.rb', '.swift', '.kt', '.scala'
  ];
  return codeExtensions.some(ext => filename.endsWith(ext));
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
