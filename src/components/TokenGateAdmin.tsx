import { useState, useEffect } from 'react';
import { Shield, Settings, Users, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getChainName } from '../lib/tokenGate';

interface TokenGateConfig {
  id: string;
  enabled: boolean;
  contract_address: string | null;
  chain_id: number;
  minimum_balance: number;
  token_standard: string;
  whitelist_addresses: string[];
  rate_limit_enabled: boolean;
  free_scans_per_day: number;
}

export function TokenGateAdmin() {
  const [config, setConfig] = useState<TokenGateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newWhitelistAddress, setNewWhitelistAddress] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('token_gate_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error loading config:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('token_gate_config')
        .update({
          enabled: config.enabled,
          contract_address: config.contract_address,
          chain_id: config.chain_id,
          minimum_balance: config.minimum_balance,
          token_standard: config.token_standard,
          whitelist_addresses: config.whitelist_addresses,
          rate_limit_enabled: config.rate_limit_enabled,
          free_scans_per_day: config.free_scans_per_day,
        })
        .eq('id', config.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const addWhitelistAddress = () => {
    if (!config || !newWhitelistAddress) return;

    const address = newWhitelistAddress.trim();
    if (address.length < 32 || address.length > 44) {
      setMessage({ type: 'error', text: 'Invalid Solana address' });
      return;
    }

    if (config.whitelist_addresses.includes(address)) {
      setMessage({ type: 'error', text: 'Address already in whitelist' });
      return;
    }

    setConfig({
      ...config,
      whitelist_addresses: [...config.whitelist_addresses, address],
    });
    setNewWhitelistAddress('');
  };

  const removeWhitelistAddress = (address: string) => {
    if (!config) return;

    setConfig({
      ...config,
      whitelist_addresses: config.whitelist_addresses.filter(a => a !== address),
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Token Gate Settings</h1>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Token Gate Status</h2>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Contract Address
            </label>
            <input
              type="text"
              value={config.contract_address || ''}
              onChange={(e) => setConfig({ ...config, contract_address: e.target.value })}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blockchain Network
              </label>
              <select
                value={config.chain_id}
                onChange={(e) => setConfig({ ...config, chain_id: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>Solana Mainnet</option>
                <option value={2}>Solana Devnet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Standard
              </label>
              <select
                value={config.token_standard}
                onChange={(e) => setConfig({ ...config, token_standard: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="SPL">SPL Token</option>
                <option value="NFT">Solana NFT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Token Balance Required
            </label>
            <input
              type="number"
              value={config.minimum_balance}
              onChange={(e) => setConfig({ ...config, minimum_balance: parseFloat(e.target.value) })}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Whitelist Addresses</h3>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newWhitelistAddress}
                onChange={(e) => setNewWhitelistAddress(e.target.value)}
                placeholder="0x... (wallet address)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addWhitelistAddress}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>

            {config.whitelist_addresses.length > 0 ? (
              <div className="space-y-2">
                {config.whitelist_addresses.map((address) => (
                  <div
                    key={address}
                    className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg"
                  >
                    <code className="text-sm text-gray-700">{address}</code>
                    <button
                      onClick={() => removeWhitelistAddress(address)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No whitelisted addresses</p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Rate Limiting</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.rate_limit_enabled}
                onChange={(e) => setConfig({ ...config, rate_limit_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable rate limiting for non-token holders</span>
            </label>

            {config.rate_limit_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Free Scans Per Day (without tokens)
                </label>
                <input
                  type="number"
                  value={config.free_scans_per_day}
                  onChange={(e) => setConfig({ ...config, free_scans_per_day: parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Current Configuration Summary</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>Status: <strong>{config.enabled ? 'Token gate active' : 'Open access'}</strong></li>
          {config.contract_address && (
            <>
              <li>Token: {config.contract_address}</li>
              <li>Network: {getChainName(config.chain_id)}</li>
              <li>Required Balance: {config.minimum_balance} tokens</li>
            </>
          )}
          <li>Whitelisted Addresses: {config.whitelist_addresses.length}</li>
          {config.rate_limit_enabled && (
            <li>Rate Limit: {config.free_scans_per_day} free scans/day</li>
          )}
        </ul>
      </div>
    </div>
  );
}
