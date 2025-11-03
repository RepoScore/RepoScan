import { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

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

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  has_token_access: boolean;
  scans_remaining?: number;
}

export async function checkAccess(
  supabase: SupabaseClient,
  walletAddress: string | null,
  ipAddress: string,
  tokenBalance?: number
): Promise<AccessCheckResult> {
  const { data: config } = await supabase
    .from("token_gate_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!config || !config.enabled) {
    return {
      allowed: true,
      has_token_access: false,
      reason: "Token gate disabled - open access",
    };
  }

  if (walletAddress && config.whitelist_addresses.includes(walletAddress.toLowerCase())) {
    await logAccess(supabase, walletAddress, ipAddress, true, config);
    return {
      allowed: true,
      has_token_access: true,
      reason: "Whitelisted address",
    };
  }

  if (
    tokenBalance !== undefined &&
    walletAddress &&
    config.contract_address &&
    tokenBalance >= config.minimum_balance
  ) {
    await logAccess(supabase, walletAddress, ipAddress, true, config);
    return {
      allowed: true,
      has_token_access: true,
      reason: "Valid token holder",
    };
  }

  if (config.rate_limit_enabled) {
    const rateLimitCheck = await checkRateLimit(
      supabase,
      walletAddress,
      ipAddress,
      config.free_scans_per_day
    );

    if (rateLimitCheck.allowed) {
      await logAccess(supabase, walletAddress, ipAddress, false, config);
      return {
        allowed: true,
        has_token_access: false,
        reason: "Within free scan limit",
        scans_remaining: rateLimitCheck.scans_remaining,
      };
    } else {
      return {
        allowed: false,
        has_token_access: false,
        reason: "Rate limit exceeded. Hold tokens for unlimited access.",
        scans_remaining: 0,
      };
    }
  }

  return {
    allowed: false,
    has_token_access: false,
    reason: "Token gate enabled. Token required for access.",
  };
}

async function checkRateLimit(
  supabase: SupabaseClient,
  walletAddress: string | null,
  ipAddress: string,
  freeScansPerDay: number
): Promise<{ allowed: boolean; scans_remaining: number }> {
  const today = new Date().toISOString().split("T")[0];
  const identifier = walletAddress || ipAddress;

  const { data: logs, error } = await supabase
    .from("scan_access_log")
    .select("scan_count")
    .or(`wallet_address.eq.${identifier},ip_address.eq.${identifier}`)
    .eq("scan_date", today)
    .eq("has_token_access", false);

  if (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, scans_remaining: freeScansPerDay };
  }

  const totalScans = logs?.reduce((sum, log) => sum + log.scan_count, 0) || 0;
  const scansRemaining = Math.max(0, freeScansPerDay - totalScans);

  return {
    allowed: totalScans < freeScansPerDay,
    scans_remaining: scansRemaining,
  };
}

async function logAccess(
  supabase: SupabaseClient,
  walletAddress: string | null,
  ipAddress: string,
  hasTokenAccess: boolean,
  config: TokenGateConfig
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const identifier = walletAddress || ipAddress;

  const { data: existingLog } = await supabase
    .from("scan_access_log")
    .select("*")
    .or(`wallet_address.eq.${identifier},ip_address.eq.${identifier}`)
    .eq("scan_date", today)
    .eq("has_token_access", hasTokenAccess)
    .maybeSingle();

  if (existingLog) {
    await supabase
      .from("scan_access_log")
      .update({ scan_count: existingLog.scan_count + 1 })
      .eq("id", existingLog.id);
  } else {
    await supabase.from("scan_access_log").insert({
      wallet_address: walletAddress,
      ip_address: ipAddress,
      has_token_access: hasTokenAccess,
      scan_count: 1,
      scan_date: today,
    });
  }
}

export async function verifyTokenBalance(
  walletAddress: string,
  contractAddress: string,
  chainId: number,
  rpcUrl?: string
): Promise<number> {
  try {
    if (!rpcUrl) {
      rpcUrl = getRpcUrl(chainId);
    }

    const balanceHex = await callEthRpc(rpcUrl, "eth_call", [
      {
        to: contractAddress,
        data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}`,
      },
      "latest",
    ]);

    return parseInt(balanceHex, 16) / 1e18;
  } catch (error) {
    console.error("Token balance check error:", error);
    return 0;
  }
}

async function callEthRpc(
  rpcUrl: string,
  method: string,
  params: any[]
): Promise<any> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const data = await response.json();
  return data.result;
}

function getRpcUrl(chainId: number): string {
  const rpcUrls: Record<number, string> = {
    1: "https://eth.llamarpc.com",
    137: "https://polygon-rpc.com",
    8453: "https://mainnet.base.org",
    42161: "https://arb1.arbitrum.io/rpc",
    10: "https://mainnet.optimism.io",
  };

  return rpcUrls[chainId] || rpcUrls[1];
}
