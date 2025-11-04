import { Code, FileCode, GitBranch, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { CodeQualityMetrics } from '../lib/supabase';

interface CodeQualityReportProps {
  metrics: CodeQualityMetrics;
}

export function CodeQualityReport({ metrics }: CodeQualityReportProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-900/20 border-green-500/40';
    if (score >= 60) return 'bg-yellow-900/20 border-yellow-500/40';
    return 'bg-red-900/20 border-red-500/40';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border-2 border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <Code className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100">Code Quality Analysis</h3>
      </div>

      <div className={`rounded-xl p-6 border-2 mb-6 ${getScoreBg(metrics.quality_score)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">Overall Quality Score</span>
          <TrendingUp className={`w-5 h-5 ${getScoreColor(metrics.quality_score)}`} />
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(metrics.quality_score)}`}>
          {metrics.quality_score}
          <span className="text-2xl">/100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <FileCode className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Files Analyzed</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">{metrics.total_files_analyzed}</div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Avg Complexity</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">{metrics.avg_complexity}</div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Comment Ratio</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">
            {(metrics.comment_ratio * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <FileCode className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Avg File Size</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">
            {(metrics.avg_file_size / 1000).toFixed(1)}
            <span className="text-sm font-normal">KB</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="text-sm font-medium text-slate-400 mb-1">Large Files</div>
          <div className="text-xl font-bold text-slate-200">
            {metrics.large_files_count} files &gt; 50KB
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <div className="text-sm font-medium text-slate-400 mb-1">Duplication Risk</div>
          <div className="text-xl font-bold text-slate-200">
            {metrics.code_duplication_risk}%
          </div>
        </div>
      </div>

      {metrics.issues.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-100 text-sm mb-3">Quality Issues</h4>
          {metrics.issues.map((issue, index) => (
            <div
              key={index}
              className="flex items-start gap-2 bg-amber-900/20 border border-amber-500/40 rounded-lg p-3"
            >
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-300">{issue}</span>
            </div>
          ))}
        </div>
      )}

      {metrics.issues.length === 0 && (
        <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/40 rounded-lg p-3">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-300">No major quality issues detected</span>
        </div>
      )}
    </div>
  );
}
