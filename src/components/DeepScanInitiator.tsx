import { useState } from 'react';
import { Brain, Sparkles, Shield, Code, TrendingUp, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { DeepScanService, DeepScan } from '../lib/deepScan';

interface DeepScanInitiatorProps {
  repositoryUrl: string;
  walletAddress: string | null;
  repoScanId?: string;
  onScanCreated?: (scan: DeepScan) => void;
}

export function DeepScanInitiator({ repositoryUrl, walletAddress, repoScanId, onScanCreated }: DeepScanInitiatorProps) {
  const [selectedScanType, setSelectedScanType] = useState<DeepScan['scan_type']>('full');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanTypes = [
    {
      type: 'full' as const,
      icon: Brain,
      title: 'Full Deep Scan',
      description: 'Comprehensive AI-powered analysis covering security, architecture, code quality, and performance',
      color: 'from-purple-500 to-pink-500',
      features: ['Security Analysis', 'Architecture Review', 'Code Quality', 'Performance Insights', 'Best Practices']
    },
    {
      type: 'security_focused' as const,
      icon: Shield,
      title: 'Security Focused',
      description: 'In-depth security vulnerability detection and threat analysis',
      color: 'from-red-500 to-orange-500',
      features: ['Vulnerability Detection', 'Threat Analysis', 'Dependency Audit', 'Security Best Practices']
    },
    {
      type: 'architecture' as const,
      icon: Code,
      title: 'Architecture Analysis',
      description: 'Evaluate system design, patterns, and structural integrity',
      color: 'from-blue-500 to-cyan-500',
      features: ['Design Patterns', 'Code Structure', 'Modularity', 'Scalability Assessment']
    },
    {
      type: 'code_quality' as const,
      icon: Sparkles,
      title: 'Code Quality',
      description: 'Assess code maintainability, readability, and technical debt',
      color: 'from-green-500 to-emerald-500',
      features: ['Code Smells', 'Technical Debt', 'Maintainability', 'Documentation Quality']
    },
    {
      type: 'performance' as const,
      icon: Zap,
      title: 'Performance Analysis',
      description: 'Identify bottlenecks and optimization opportunities',
      color: 'from-yellow-500 to-orange-500',
      features: ['Performance Bottlenecks', 'Memory Issues', 'Optimization Tips', 'Efficiency Metrics']
    }
  ];

  const handleInitiateScan = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet to initiate a deep scan');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const scan = await DeepScanService.createScan({
        repository_url: repositoryUrl,
        initiated_by: walletAddress,
        scan_type: selectedScanType,
        repo_scan_id: repoScanId
      });

      if (onScanCreated) {
        onScanCreated(scan);
      }
    } catch (err) {
      console.error('Error creating deep scan:', err);
      setError('Failed to initiate deep scan. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!walletAddress) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-8 h-8 text-purple-400" />
          <h2 className="text-2xl font-bold text-slate-100">Deep Scan with Claude AI</h2>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-300 mb-2">Wallet Connection Required</h3>
          <p className="text-blue-200">
            Please connect your wallet to access the Claude AI-powered deep scan feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-purple-400" />
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Deep Scan with Claude AI</h2>
          <p className="text-sm text-slate-400">Advanced AI-powered repository analysis</p>
        </div>
      </div>

      <div className="bg-purple-900/20 border border-purple-500/40 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-300">
            <p className="font-semibold mb-1">Coming Soon: Claude AI Integration</p>
            <p>
              Deep Scan will use Claude AI to provide comprehensive code analysis, security insights,
              architectural recommendations, and performance optimization suggestions. The interface is
              ready for integration once the Claude API is configured.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Select Scan Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scanTypes.map((scanType) => {
            const Icon = scanType.icon;
            return (
              <div
                key={scanType.type}
                onClick={() => setSelectedScanType(scanType.type)}
                className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all ${
                  selectedScanType === scanType.type
                    ? 'border-purple-500 bg-purple-900/20 shadow-lg shadow-purple-500/20'
                    : 'border-slate-700/50 bg-slate-900/30 hover:border-slate-600'
                }`}
              >
                {selectedScanType === scanType.type && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  </div>
                )}

                <div className={`bg-gradient-to-r ${scanType.color} rounded-lg p-3 inline-block mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h4 className="text-lg font-bold text-slate-200 mb-2">{scanType.title}</h4>
                <p className="text-sm text-slate-400 mb-4">{scanType.description}</p>

                <div className="space-y-1">
                  {scanType.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Scan Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Repository</label>
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 text-sm font-mono truncate">
              {repositoryUrl}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Scan Type</label>
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 text-sm">
              {scanTypes.find(st => st.type === selectedScanType)?.title}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleInitiateScan}
          disabled={isCreating || !walletAddress}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Initiating Scan...</span>
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              <span>Start Deep Scan (Coming Soon)</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/30 rounded-lg border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-slate-400">Advanced Insights</span>
          </div>
          <p className="text-xs text-slate-500">
            Get AI-powered recommendations for architecture improvements and best practices
          </p>
        </div>

        <div className="bg-slate-900/30 rounded-lg border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-slate-400">Security Analysis</span>
          </div>
          <p className="text-xs text-slate-500">
            Identify vulnerabilities and security issues with detailed explanations
          </p>
        </div>

        <div className="bg-slate-900/30 rounded-lg border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-medium text-slate-400">Performance Tips</span>
          </div>
          <p className="text-xs text-slate-500">
            Discover optimization opportunities and performance bottlenecks
          </p>
        </div>
      </div>
    </div>
  );
}
