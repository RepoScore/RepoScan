import { useState, useEffect } from 'react';
import { Lock, Clock, Shield, AlertCircle } from 'lucide-react';
import { TokenLockService, TokenLock, TokenLockStats } from '../lib/tokenLock';

interface TokenLockDashboardProps {
  walletAddress: string | null;
}

export function TokenLockDashboard({ walletAddress }: TokenLockDashboardProps) {
  const [activeLocks, setActiveLocks] = useState<TokenLock[]>([]);
  const [stats, setStats] = useState<TokenLockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockAmount, setLockAmount] = useState('');
  const [lockDuration, setLockDuration] = useState(30);

  useEffect(() => {
    loadData();
  }, [walletAddress]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (walletAddress) {
        const locksData = await TokenLockService.getActiveLocks(walletAddress);
        const statsData = await TokenLockService.getUserStats(walletAddress);
        setActiveLocks(locksData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading token lock data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (!walletAddress) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8 text-center">
        <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-200 mb-2">Connect Your Wallet</h3>
        <p className="text-slate-400">Please connect your wallet to view and manage token locks</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading token lock data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && stats.active_locks_count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-slate-400">Total Locked</span>
            </div>
            <div className="text-2xl font-bold text-slate-200">
              {TokenLockService.formatTokenAmount(stats.total_locked)}
            </div>
            <div className="text-xs text-slate-500 mt-1">REPOSCAN Tokens</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm text-slate-400">Active Locks</span>
            </div>
            <div className="text-2xl font-bold text-slate-200">{stats.active_locks_count}</div>
            <div className="text-xs text-slate-500 mt-1">Current locks</div>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-slate-100">Token Lock System</h2>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-4">Lock Tokens (Coming Soon)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Amount to Lock
              </label>
              <input
                type="text"
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Lock Duration (Days)
              </label>
              <select
                value={lockDuration}
                onChange={(e) => setLockDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled
              >
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={180}>180 Days</option>
                <option value={365}>365 Days</option>
              </select>
            </div>
          </div>

          <button
            disabled
            className="w-full bg-slate-700 text-slate-400 font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
          >
            Lock Tokens (Feature Coming Soon)
          </button>

          <div className="mt-4 bg-blue-900/20 border border-blue-500/40 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold mb-1">Token Lock Feature Status</p>
                <p>
                  The token lock mechanism is currently under development. Once the smart contract
                  is deployed and integrated, users will be able to lock 1,000,000 tokens for 30 days
                  to access DeepScan features without paying per scan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeLocks.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
          <h3 className="text-xl font-bold text-slate-200 mb-6">Your Active Locks</h3>

          <div className="space-y-4">
            {activeLocks.map((lock) => (
              <div
                key={lock.id}
                className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-2xl font-bold text-slate-200 mb-1">
                      {TokenLockService.formatTokenAmount(lock.token_amount)}
                    </div>
                    <div className="text-sm text-slate-400">REPOSCAN Tokens</div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    lock.status === 'active' ? 'bg-green-900/30 text-green-400 border border-green-500/40' :
                    lock.status === 'completed' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/40' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {lock.status.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>Lock Duration</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      {lock.lock_duration_days} days
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>Remaining Time</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      {TokenLockService.getRemainingDays(lock)} days
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>End Date</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      {new Date(lock.lock_end_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {lock.transaction_hash && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="text-xs text-slate-400">Transaction Hash</div>
                    <div className="text-xs text-slate-300 font-mono break-all">
                      {lock.transaction_hash}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
