export interface ClaudeAnalysisConfig {
  api_key?: string;
  model: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku';
  max_tokens: number;
  temperature: number;
  enabled: boolean;
}

export interface DeepScanConfig {
  claude: ClaudeAnalysisConfig;
  analysis_options: {
    analyze_dependencies: boolean;
    check_security_vulnerabilities: boolean;
    evaluate_architecture: boolean;
    assess_code_quality: boolean;
    check_performance: boolean;
    analyze_documentation: boolean;
    detect_code_smells: boolean;
    find_technical_debt: boolean;
  };
  file_filters: {
    max_file_size_bytes: number;
    include_patterns: string[];
    exclude_patterns: string[];
    supported_languages: string[];
  };
  limits: {
    max_files_per_scan: number;
    max_lines_per_file: number;
    max_total_lines: number;
    timeout_seconds: number;
  };
}

export interface AnalysisPrompt {
  type: 'security' | 'architecture' | 'code_quality' | 'performance' | 'full';
  context: string;
  code_samples: Array<{
    file_path: string;
    content: string;
    language: string;
  }>;
  focus_areas?: string[];
}

export interface ClaudeAnalysisResponse {
  findings: Array<{
    category: string;
    severity: string;
    title: string;
    description: string;
    file_path?: string;
    line_number?: number;
    code_snippet?: string;
    recommendation: string;
    confidence_score: number;
    explanation: string;
  }>;
  insights: Array<{
    insight_type: string;
    title: string;
    description: string;
    impact: string;
    effort_to_fix: string;
    affected_files: string[];
    recommendations: string[];
  }>;
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    category: string;
    threshold_status: string;
  }>;
  summary: string;
  tokens_used: number;
}

export interface DeepScanProgress {
  scan_id: string;
  status: string;
  progress_percentage: number;
  current_step: string;
  files_processed: number;
  total_files: number;
  estimated_time_remaining_seconds?: number;
}

export interface CodeAnalysisContext {
  repository_url: string;
  repository_name: string;
  primary_language: string;
  file_structure: Array<{path: string; type: string; size: number}>;
  dependencies: Array<{name: string; version: string; type: string}>;
  readme_content?: string;
  package_info?: Record<string, any>;
}
