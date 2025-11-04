import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, TrendingUp, Code, Shield, FileText, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';
import { DeepScanService, DeepScan, DeepScanFinding, DeepScanInsight, DeepScanMetric, DeepScanSummary } from '../lib/deepScan';

interface DeepScanResultsProps {
  scanId: string;
}

export function DeepScanResults({ scanId }: DeepScanResultsProps) {
  const [summary, setSummary] = useState<DeepScanSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScanResults();
  }, [scanId]);

  const loadScanResults = async () => {
    try {
      setLoading(true);
      const data = await DeepScanService.getScanSummary(scanId);
      setSummary(data);
    } catch (error) {
      console.error('Error loading scan results:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFinding = (findingId: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(findingId)) {
      newExpanded.delete(findingId);
    } else {
      newExpanded.add(findingId);
    }
    setExpandedFindings(newExpanded);
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading scan results...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-slate-400">Scan results not found</p>
      </div>
    );
  }

  const { scan, findings_count, insights_count, metrics_count, top_issues, key_insights } = summary;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Deep Scan Results</h2>
              <p className="text-sm text-slate-400">{scan.repository_url}</p>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            scan.status === 'completed' ? 'bg-green-900/30 text-green-400 border border-green-500/40' :
            scan.status === 'processing' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/40' :
            scan.status === 'failed' ? 'bg-red-900/30 text-red-400 border border-red-500/40' :
            'bg-slate-700 text-slate-300'
          }`}>
            {scan.status.toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Files Analyzed</div>
            <div className="text-2xl font-bold text-slate-200">{scan.total_files_analyzed}</div>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Lines of Code</div>
            <div className="text-2xl font-bold text-slate-200">{scan.total_lines_analyzed.toLocaleString()}</div>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Duration</div>
            <div className="text-2xl font-bold text-slate-200">
              {DeepScanService.formatDuration(scan.scan_duration_seconds)}
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Claude Tokens</div>
            <div className="text-2xl font-bold text-slate-200">{scan.claude_tokens_used.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{findings_count.critical}</div>
            <div className="text-xs text-red-300">Critical</div>
          </div>

          <div className="bg-orange-900/20 border border-orange-500/40 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{findings_count.high}</div>
            <div className="text-xs text-orange-300">High</div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{findings_count.medium}</div>
            <div className="text-xs text-yellow-300">Medium</div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{findings_count.low}</div>
            <div className="text-xs text-blue-300">Low</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-600/40 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-400">{findings_count.info}</div>
            <div className="text-xs text-slate-400">Info</div>
          </div>
        </div>
      </div>

      {top_issues.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-xl font-bold text-slate-100">Top Priority Issues</h3>
          </div>

          <div className="space-y-4">
            {top_issues.map((finding) => (
              <div
                key={finding.id}
                className={`rounded-xl border ${DeepScanService.getSeverityBgColor(finding.severity)} p-6`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${DeepScanService.getSeverityBgColor(finding.severity)}`}>
                        {finding.severity.toUpperCase()}
                      </span>
                      <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                        {finding.category}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-200 mb-2">{finding.title}</h4>
                    <p className="text-sm text-slate-400">{finding.description}</p>
                  </div>

                  <button
                    onClick={() => toggleFinding(finding.id)}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    {expandedFindings.has(finding.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>

                {finding.file_path && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <FileText className="w-3 h-3" />
                    <span className="font-mono">{finding.file_path}</span>
                    {finding.line_number && <span>Line {finding.line_number}</span>}
                  </div>
                )}

                {expandedFindings.has(finding.id) && (
                  <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-4">
                    {finding.code_snippet && (
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-2">Code Snippet:</div>
                        <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">
                          <code>{finding.code_snippet}</code>
                        </pre>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-semibold text-slate-400 mb-2">Recommendation:</div>
                      <p className="text-sm text-slate-300">{finding.recommendation}</p>
                    </div>

                    {finding.ai_explanation && (
                      <div>
                        <div className="text-xs font-semibold text-slate-400 mb-2">AI Analysis:</div>
                        <p className="text-sm text-slate-300">{finding.ai_explanation}</p>
                      </div>
                    )}

                    {finding.confidence_score !== undefined && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">Confidence:</span>
                        <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-purple-500 h-full transition-all"
                            style={{ width: `${finding.confidence_score}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-300">{finding.confidence_score}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {key_insights.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-bold text-slate-100">Key Insights</h3>
          </div>

          <div className="space-y-4">
            {key_insights.map((insight) => (
              <div
                key={insight.id}
                className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300">
                        {insight.insight_type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-semibold ${DeepScanService.getImpactColor(insight.impact)}`}>
                        {insight.impact.toUpperCase()} IMPACT
                      </span>
                      <span className="text-xs text-slate-400">
                        {insight.effort_to_fix.toUpperCase()} EFFORT
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-200 mb-2">{insight.title}</h4>
                    <p className="text-sm text-slate-400">{insight.description}</p>
                  </div>

                  {insight.priority_score !== undefined && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{insight.priority_score}</div>
                      <div className="text-xs text-slate-500">Priority</div>
                    </div>
                  )}
                </div>

                {insight.affected_files.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Affected Files ({insight.affected_files.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {insight.affected_files.slice(0, 5).map((file, idx) => (
                        <span key={idx} className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-mono">
                          {file}
                        </span>
                      ))}
                      {insight.affected_files.length > 5 && (
                        <span className="text-xs text-slate-500">
                          +{insight.affected_files.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {insight.recommendations.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-400 mb-2">Recommendations:</div>
                    <ul className="space-y-1">
                      {insight.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-purple-900/20 border border-purple-500/40 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-300">
            <p className="font-semibold mb-1">Deep Scan Complete</p>
            <p>
              This scan analyzed {scan.total_files_analyzed} files with {scan.total_lines_analyzed.toLocaleString()} lines of code
              using Claude AI. The analysis identified {findings_count.critical + findings_count.high + findings_count.medium} actionable issues
              and provided {insights_count} strategic insights for improving your codebase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
