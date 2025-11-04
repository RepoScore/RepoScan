import { supabase } from './supabase';

export interface DeepScan {
  id: string;
  repo_scan_id?: string;
  repository_url: string;
  initiated_by: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scan_type: 'full' | 'security_focused' | 'architecture' | 'code_quality' | 'performance';
  total_files_analyzed: number;
  total_lines_analyzed: number;
  claude_tokens_used: number;
  scan_duration_seconds?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface DeepScanFinding {
  id: string;
  deep_scan_id: string;
  category: 'security' | 'architecture' | 'code_quality' | 'performance' | 'maintainability' | 'documentation';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  file_path?: string;
  line_number?: number;
  code_snippet?: string;
  recommendation: string;
  confidence_score?: number;
  ai_explanation?: string;
  tags?: string[];
  created_at: string;
}

export interface DeepScanInsight {
  id: string;
  deep_scan_id: string;
  insight_type: 'architecture_pattern' | 'design_flaw' | 'best_practice' | 'optimization' | 'technical_debt';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort_to_fix: 'high' | 'medium' | 'low';
  affected_files: string[];
  code_examples: Array<{file: string; code: string; line?: number}>;
  recommendations: string[];
  priority_score?: number;
  created_at: string;
}

export interface DeepScanMetric {
  id: string;
  deep_scan_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  category: string;
  threshold_status?: 'pass' | 'warning' | 'fail';
  context: Record<string, any>;
  created_at: string;
}

export interface DeepScanReport {
  id: string;
  deep_scan_id: string;
  report_type: 'executive_summary' | 'technical_details' | 'remediation_plan' | 'comparison';
  content: string;
  generated_at: string;
  format: 'markdown' | 'html' | 'json' | 'pdf';
}

export interface DeepScanComparison {
  id: string;
  scan_id_1: string;
  scan_id_2: string;
  comparison_summary: string;
  improvements: Array<{category: string; description: string; metrics?: any}>;
  regressions: Array<{category: string; description: string; metrics?: any}>;
  unchanged_areas: Array<{category: string; description: string}>;
  overall_trend?: 'improved' | 'declined' | 'stable';
  created_at: string;
}

export interface CreateDeepScanParams {
  repository_url: string;
  initiated_by: string;
  scan_type: DeepScan['scan_type'];
  repo_scan_id?: string;
}

export interface DeepScanSummary {
  scan: DeepScan;
  findings_count: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  insights_count: number;
  metrics_count: number;
  top_issues: DeepScanFinding[];
  key_insights: DeepScanInsight[];
}

export class DeepScanService {
  static async createScan(params: CreateDeepScanParams): Promise<DeepScan> {
    const { data, error } = await supabase
      .from('deep_scans')
      .insert({
        repository_url: params.repository_url,
        initiated_by: params.initiated_by,
        scan_type: params.scan_type,
        repo_scan_id: params.repo_scan_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getScanById(scanId: string): Promise<DeepScan | null> {
    const { data, error } = await supabase
      .from('deep_scans')
      .select('*')
      .eq('id', scanId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getUserScans(walletAddress: string): Promise<DeepScan[]> {
    const { data, error } = await supabase
      .from('deep_scans')
      .select('*')
      .eq('initiated_by', walletAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateScanStatus(
    scanId: string,
    status: DeepScan['status'],
    errorMessage?: string
  ): Promise<void> {
    const updates: Partial<DeepScan> = { status };
    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('deep_scans')
      .update(updates)
      .eq('id', scanId);

    if (error) throw error;
  }

  static async addFinding(finding: Omit<DeepScanFinding, 'id' | 'created_at'>): Promise<DeepScanFinding> {
    const { data, error } = await supabase
      .from('deep_scan_findings')
      .insert(finding)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getFindings(scanId: string): Promise<DeepScanFinding[]> {
    const { data, error } = await supabase
      .from('deep_scan_findings')
      .select('*')
      .eq('deep_scan_id', scanId)
      .order('severity', { ascending: true })
      .order('confidence_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getFindingsByCategory(scanId: string, category: string): Promise<DeepScanFinding[]> {
    const { data, error } = await supabase
      .from('deep_scan_findings')
      .select('*')
      .eq('deep_scan_id', scanId)
      .eq('category', category)
      .order('severity', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addInsight(insight: Omit<DeepScanInsight, 'id' | 'created_at' | 'priority_score'>): Promise<DeepScanInsight> {
    const { data, error } = await supabase
      .from('deep_scan_insights')
      .insert(insight)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getInsights(scanId: string): Promise<DeepScanInsight[]> {
    const { data, error } = await supabase
      .from('deep_scan_insights')
      .select('*')
      .eq('deep_scan_id', scanId)
      .order('priority_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async addMetric(metric: Omit<DeepScanMetric, 'id' | 'created_at'>): Promise<DeepScanMetric> {
    const { data, error } = await supabase
      .from('deep_scan_metrics')
      .insert(metric)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getMetrics(scanId: string): Promise<DeepScanMetric[]> {
    const { data, error } = await supabase
      .from('deep_scan_metrics')
      .select('*')
      .eq('deep_scan_id', scanId)
      .order('category', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async generateReport(
    scanId: string,
    reportType: DeepScanReport['report_type'],
    content: string,
    format: DeepScanReport['format'] = 'markdown'
  ): Promise<DeepScanReport> {
    const { data, error } = await supabase
      .from('deep_scan_reports')
      .insert({
        deep_scan_id: scanId,
        report_type: reportType,
        content,
        format
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getReports(scanId: string): Promise<DeepScanReport[]> {
    const { data, error } = await supabase
      .from('deep_scan_reports')
      .select('*')
      .eq('deep_scan_id', scanId)
      .order('generated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createComparison(
    scanId1: string,
    scanId2: string,
    comparisonData: Omit<DeepScanComparison, 'id' | 'scan_id_1' | 'scan_id_2' | 'created_at'>
  ): Promise<DeepScanComparison> {
    const { data, error } = await supabase
      .from('deep_scan_comparisons')
      .insert({
        scan_id_1: scanId1,
        scan_id_2: scanId2,
        ...comparisonData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getScanSummary(scanId: string): Promise<DeepScanSummary | null> {
    const scan = await this.getScanById(scanId);
    if (!scan) return null;

    const findings = await this.getFindings(scanId);
    const insights = await this.getInsights(scanId);
    const metrics = await this.getMetrics(scanId);

    const findingsCount = {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length
    };

    const topIssues = findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 5);

    const keyInsights = insights
      .filter(i => i.impact === 'high')
      .slice(0, 5);

    return {
      scan,
      findings_count: findingsCount,
      insights_count: insights.length,
      metrics_count: metrics.length,
      top_issues: topIssues,
      key_insights: keyInsights
    };
  }

  static async processScanWithClaude(scanId: string, repoData: any): Promise<void> {
    throw new Error('Claude AI integration not yet implemented. This method will use Claude API to analyze repository code.');
  }

  static getSeverityColor(severity: DeepScanFinding['severity']): string {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      case 'info': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  }

  static getSeverityBgColor(severity: DeepScanFinding['severity']): string {
    switch (severity) {
      case 'critical': return 'bg-red-900/30 border-red-500/40';
      case 'high': return 'bg-orange-900/30 border-orange-500/40';
      case 'medium': return 'bg-yellow-900/30 border-yellow-500/40';
      case 'low': return 'bg-blue-900/30 border-blue-500/40';
      case 'info': return 'bg-slate-800/30 border-slate-500/40';
      default: return 'bg-slate-800/30 border-slate-500/40';
    }
  }

  static getImpactColor(impact: 'high' | 'medium' | 'low'): string {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  }

  static formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
