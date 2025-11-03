export interface TokenGateConfig {
  enabled: boolean;
  contract_address: string | null;
  chain_id: number;
  minimum_balance: number;
  token_standard: string;
  whitelist_addresses: string[];
  rate_limit_enabled: boolean;
  free_scans_per_day: number;
}

export interface ScanRequest {
  githubUrl: string;
  walletAddress?: string;
  tokenBalance?: number;
}

export interface ScanResponse {
  success: boolean;
  scan?: any;
  error?: string;
  token_gate_active?: boolean;
  scans_remaining?: number;
  access_info?: {
    has_token_access: boolean;
    scans_remaining?: number;
  };
}

export async function fetchTokenGateConfig(): Promise<TokenGateConfig | null> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/token_gate_config?limit=1`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching token gate config:', error);
    return null;
  }
}

export async function verifyWalletTokenBalance(
  walletAddress: string,
  contractAddress: string,
  chainId: number
): Promise<number> {
  try {
    const rpcUrl = getRpcUrl(chainId);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: contractAddress,
            data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}`,
          },
          'latest',
        ],
      }),
    });

    const data = await response.json();
    if (data.result) {
      return parseInt(data.result, 16) / 1e18;
    }
    return 0;
  } catch (error) {
    console.error('Error verifying token balance:', error);
    return 0;
  }
}

function getRpcUrl(chainId: number): string {
  const rpcUrls: Record<number, string> = {
    1: 'https://eth.llamarpc.com',
    137: 'https://polygon-rpc.com',
    8453: 'https://mainnet.base.org',
    42161: 'https://arb1.arbitrum.io/rpc',
    10: 'https://mainnet.optimism.io',
  };

  return rpcUrls[chainId] || rpcUrls[1];
}

export function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    8453: 'Base',
    42161: 'Arbitrum',
    10: 'Optimism',
  };

  return chainNames[chainId] || `Chain ${chainId}`;
}
