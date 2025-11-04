import { useState, useEffect } from 'react';
import { Shield, Users, Lock, TrendingUp, AlertCircle } from 'lucide-react';
import { TokenLockService } from '../lib/tokenLock';
import { supabase } from '../lib/supabase';

interface AdminStats {
  total_locks: number;
  total_value_locked: number;
  active_users: number;
}

export function TokenLockAdmin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      const { data: locksData } = await supabase
        .from('token_locks')
        .select('token_amount, status, wallet_address');

      if (locksData) {
        const totalLocks = locksData.length;
        const activeLocks = locksData.filter(l => l.status === 'active');
        const totalValueLocked = activeLocks.reduce((sum, l) => sum + Number(l.token_amount), 0);
        const uniqueUsers = new Set(locksData.map(l => l.wallet_address)).size;

        setStats({
          total_locks: totalLocks,
          total_value_locked: totalValueLocked,
          active_users: uniqueUsers
        });
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading admin data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-slate-100">Token Lock Administration</h2>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-slate-400">Total Locks</span>
              </div>
              <div className="text-2xl font-bold text-slate-200">{stats.total_locks}</div>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm text-slate-400">Total Value Locked</span>
              </div>
              <div className="text-2xl font-bold text-slate-200">
                {TokenLockService.formatTokenAmount(stats.total_value_locked)}
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-slate-400">Active Users</span>
              </div>
              <div className="text-2xl font-bold text-slate-200">{stats.active_users}</div>
            </div>
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-semibold mb-1">Admin Panel - Development Mode</p>
              <p>
                This admin interface provides monitoring of the token lock system.
                The system requires locking 1,000,000 tokens for 30 days to access DeepScan features.
              </p>
            </div>
          </div>
        </div>
      </div>


      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
        <h3 className="text-xl font-bold text-slate-200 mb-4">System Configuration</h3>

        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
            <h4 className="font-semibold text-slate-200 mb-4">Lock Settings</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Required Lock Amount</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                  value="1,000,000 tokens"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Lock Duration</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                  value="30 days"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Early Withdrawal Penalty (%)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                  placeholder="10.0"
                  disabled
                />
              </div>
            </div>

            <button
              className="mt-4 w-full bg-slate-700 text-slate-400 py-2 px-4 rounded-lg cursor-not-allowed"
              disabled
            >
              Save Settings (Coming Soon)
            </button>
          </div>

          <div className="bg-amber-900/20 border border-amber-500/40 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-semibold mb-1">Configuration Note</p>
                <p>
                  System configuration will be managed through smart contracts once deployed.
                  These settings are for planning purposes only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
