import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Github, Loader2, TrendingUp, Info } from 'lucide-react';
import { Twitter } from 'lucide-react';
import { RepoScan } from '../lib/supabase';
import { ScoreCard } from './ScoreCard';

export function RepoScanner() {
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<RepoScan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-repo`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ githubUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan repository');
      }

      setScanResult(data.scan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const safetyLabels = {
    dependency_risks: 'Dependency Risks',
    code_security: 'Code Security',
    config_hygiene: 'Config Hygiene',
    code_quality: 'Code Quality',
    maintenance_posture: 'Maintenance',
  };

  const safetyWeights = {
    dependency_risks: 30,
    code_security: 30,
    config_hygiene: 15,
    code_quality: 15,
    maintenance_posture: 10,
  };

  const legitimacyLabels = {
    working_evidence: 'Working Evidence',
    transparency_docs: 'Transparency',
    community_signals: 'Community',
    author_reputation: 'Author Reputation',
    license_compliance: 'License',
  };

  const legitimacyWeights = {
    working_evidence: 40,
    transparency_docs: 20,
    community_signals: 15,
    author_reputation: 15,
    license_compliance: 10,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex flex-col items-center justify-center gap-4 mb-6">
            <img
              src="https://i.imgur.com/17jvOvf.png"
              alt="RepoScan Icon"
              className="w-20 h-20 object-contain"
            />
            <img
              src="https://i.imgur.com/j0MnzOZ.png"
              alt="RepoScan"
              className="h-12 object-contain"
            />
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
            Comprehensive dual-score analysis for GitHub repositories
          </p>
          <div className="flex items-center justify-center gap-4 mb-6">
            <a
              href="https://x.com/RepoScanner"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
            >
              <Twitter className="w-5 h-5" />
              <span className="text-sm font-medium">Follow us on X</span>
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://github.com/RepoScore/RepoScan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Github className="w-5 h-5" />
              <span className="text-sm font-medium">View on GitHub</span>
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Safety Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-600" />
              <span>Legitimacy Check</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span>Overall Score</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label htmlFor="github-url" className="block text-sm font-semibold text-slate-700 mb-2">
                GitHub Repository URL
              </label>
              <div className="relative">
                <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="github-url"
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Scanning Repository...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Scan Repository</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}
        </div>

        {scanResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">
                    Scan Results
                  </h2>
                  <p className="text-slate-600 font-mono text-sm">{scanResult.repo_name}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg">
                  <Info className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Confidence: {(scanResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <ScoreCard
                  title="Safety Score"
                  score={scanResult.safety_score}
                  icon="safety"
                  breakdown={scanResult.breakdown.safety}
                  labels={safetyLabels}
                  weights={safetyWeights}
                />

                <ScoreCard
                  title="Legitimacy Score"
                  score={scanResult.legitimacy_score}
                  icon="legitimacy"
                  breakdown={scanResult.breakdown.legitimacy}
                  labels={legitimacyLabels}
                  weights={legitimacyWeights}
                />

                <ScoreCard
                  title="Overall Score"
                  score={scanResult.overall_score}
                  icon="overall"
                />
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-6 border-2 border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Analysis Summary
                </h3>
                <p className="text-slate-700 leading-relaxed">{scanResult.analysis_summary}</p>
                <div className="mt-4 text-xs text-slate-500">
                  Overall Score = (Safety × 45%) + (Legitimacy × 55%)
                </div>
              </div>
            </div>

            {scanResult.positive_indicators.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Positive Indicators</span>
                  <span className="text-sm font-normal text-slate-500">
                    ({scanResult.positive_indicators.length})
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {scanResult.positive_indicators.map((indicator, index) => (
                    <div key={index} className="flex items-start space-x-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{indicator}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scanResult.risk_factors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Risk Factors</span>
                  <span className="text-sm font-normal text-slate-500">
                    ({scanResult.risk_factors.length})
                  </span>
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {scanResult.risk_factors.map((risk, index) => (
                    <div key={index} className="flex items-start space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="text-center text-sm text-slate-500">
                <p className="mb-1">
                  Scanned on {new Date(scanResult.scan_date).toLocaleString()}
                </p>
                <p className="text-xs">
                  Scan ID: {scanResult.id.substring(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
