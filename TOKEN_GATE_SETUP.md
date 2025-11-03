# Token Gate Configuration Guide

This document explains how to configure and activate the token gating feature for RepoScan.

## Overview

The token gate system allows you to restrict access to the repository scanner based on:
- ERC20/ERC721/ERC1155 token ownership
- Whitelist addresses
- Rate limiting for free tier users

By default, the token gate is **DISABLED** to allow open testing and development.

## Database Schema

The system uses two tables:

### `token_gate_config`
Stores the token gate configuration (single row):
- `enabled` - Master toggle (default: `false`)
- `contract_address` - Token contract address
- `chain_id` - Blockchain network ID (1=Ethereum, 137=Polygon, etc.)
- `minimum_balance` - Minimum tokens required
- `token_standard` - ERC20, ERC721, or ERC1155
- `whitelist_addresses` - Array of addresses that bypass token gate
- `rate_limit_enabled` - Enable rate limiting for non-holders
- `free_scans_per_day` - Free scans allowed per day

### `scan_access_log`
Tracks scan usage for rate limiting:
- `wallet_address` - User's wallet (if provided)
- `ip_address` - Request IP address
- `has_token_access` - Whether user had token access
- `scan_count` - Number of scans
- `scan_date` - Date for rate limit tracking

## How to Activate Token Gating

### Option 1: Using the Admin UI

1. Import the `TokenGateAdmin` component in your app
2. Navigate to the admin panel
3. Configure your settings:
   - Toggle "Enable" to activate
   - Enter your token contract address
   - Select the blockchain network
   - Set minimum balance required
   - Add whitelist addresses (optional)
   - Configure rate limiting
4. Click "Save Configuration"

### Option 2: Direct Database Update

```sql
-- Enable token gate with specific configuration
UPDATE token_gate_config
SET
  enabled = true,
  contract_address = '0xYourTokenContractAddress',
  chain_id = 1,  -- Ethereum mainnet
  minimum_balance = 1,
  token_standard = 'ERC20',
  rate_limit_enabled = true,
  free_scans_per_day = 3
WHERE id IN (SELECT id FROM token_gate_config LIMIT 1);
```

### Option 3: Using Supabase Dashboard

1. Open your Supabase project
2. Go to Table Editor
3. Select `token_gate_config` table
4. Edit the single row:
   - Set `enabled` to `true`
   - Fill in `contract_address`
   - Configure other fields as needed
5. Save changes

## Supported Blockchain Networks

| Network | Chain ID | RPC Endpoint |
|---------|----------|--------------|
| Ethereum | 1 | https://eth.llamarpc.com |
| Polygon | 137 | https://polygon-rpc.com |
| Base | 8453 | https://mainnet.base.org |
| Arbitrum | 42161 | https://arb1.arbitrum.io/rpc |
| Optimism | 10 | https://mainnet.optimism.io |

## Configuration Examples

### Example 1: Basic ERC20 Token Gate

```javascript
{
  enabled: true,
  contract_address: "0x1234567890123456789012345678901234567890",
  chain_id: 1,
  minimum_balance: 100,
  token_standard: "ERC20",
  whitelist_addresses: [],
  rate_limit_enabled: true,
  free_scans_per_day: 5
}
```

**Result**: Users must hold at least 100 tokens. Non-holders get 5 free scans per day.

### Example 2: NFT Gate with Whitelist

```javascript
{
  enabled: true,
  contract_address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  chain_id: 137,
  minimum_balance: 1,
  token_standard: "ERC721",
  whitelist_addresses: [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222"
  ],
  rate_limit_enabled: false,
  free_scans_per_day: 0
}
```

**Result**: Users must own at least 1 NFT from the collection on Polygon. Whitelisted addresses have unlimited access. No free scans.

### Example 3: Development/Testing Mode

```javascript
{
  enabled: false,
  contract_address: null,
  chain_id: 1,
  minimum_balance: 1,
  token_standard: "ERC20",
  whitelist_addresses: [],
  rate_limit_enabled: false,
  free_scans_per_day: 0
}
```

**Result**: Open access for everyone. This is the default configuration.

## Frontend Integration

When the token gate is enabled, users need to connect their wallet:

```typescript
import { verifyWalletTokenBalance } from './lib/tokenGate';

// Check if user has tokens
const balance = await verifyWalletTokenBalance(
  walletAddress,
  contractAddress,
  chainId
);

// Make scan request with wallet info
const response = await fetch(`${SUPABASE_URL}/functions/v1/scan-repo`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    githubUrl: 'https://github.com/owner/repo',
    walletAddress: walletAddress,
    tokenBalance: balance,
  }),
});
```

## Access Control Logic

The system checks access in this order:

1. **Token gate disabled?** → Allow access
2. **Whitelisted address?** → Allow unlimited access
3. **Valid token holder?** → Allow unlimited access
4. **Rate limiting enabled?** → Check daily limit
   - Within limit → Allow access
   - Over limit → Deny access
5. **No rate limiting?** → Deny access

## API Response Examples

### Successful Scan (Token Holder)

```json
{
  "success": true,
  "scan": { ... },
  "access_info": {
    "has_token_access": true,
    "scans_remaining": null
  }
}
```

### Successful Scan (Free Tier)

```json
{
  "success": true,
  "scan": { ... },
  "access_info": {
    "has_token_access": false,
    "scans_remaining": 3
  }
}
```

### Access Denied (Rate Limited)

```json
{
  "error": "Rate limit exceeded. Hold tokens for unlimited access.",
  "token_gate_active": true,
  "scans_remaining": 0
}
```

### Access Denied (Token Required)

```json
{
  "error": "Token gate enabled. Token required for access.",
  "token_gate_active": true,
  "scans_remaining": 0
}
```

## Testing the Token Gate

### 1. Test with Token Gate Disabled (Default)

All requests should succeed without wallet connection.

### 2. Enable Token Gate + Rate Limiting

```sql
UPDATE token_gate_config
SET enabled = true, rate_limit_enabled = true, free_scans_per_day = 3;
```

Make 4 scan requests - the 4th should be denied.

### 3. Add Your Address to Whitelist

```sql
UPDATE token_gate_config
SET whitelist_addresses = ARRAY['0xYourAddress']::text[];
```

All your requests should now succeed.

### 4. Test Token Verification

Ensure you have the correct contract address and chain ID configured, then connect a wallet that holds the tokens.

## Security Considerations

1. **Service Role Key**: The edge function uses the service role key to bypass RLS when logging access. This is necessary but secure since it's server-side.

2. **Client IP Tracking**: IP addresses are tracked for rate limiting. This is logged for non-authenticated users.

3. **Token Balance Verification**: Balance checks are performed on-chain via RPC calls. This prevents spoofing.

4. **Whitelist**: Use whitelist sparingly for team members or partners. Compromised whitelist addresses have unlimited access.

## Monitoring Usage

Query the access logs to monitor usage:

```sql
-- Daily scan counts
SELECT
  scan_date,
  SUM(scan_count) as total_scans,
  COUNT(DISTINCT wallet_address) as unique_users,
  SUM(CASE WHEN has_token_access THEN scan_count ELSE 0 END) as token_holder_scans,
  SUM(CASE WHEN NOT has_token_access THEN scan_count ELSE 0 END) as free_tier_scans
FROM scan_access_log
GROUP BY scan_date
ORDER BY scan_date DESC;
```

```sql
-- Top users by scan count
SELECT
  wallet_address,
  SUM(scan_count) as total_scans,
  MAX(scan_date) as last_scan
FROM scan_access_log
WHERE wallet_address IS NOT NULL
GROUP BY wallet_address
ORDER BY total_scans DESC
LIMIT 10;
```

## Troubleshooting

### "Failed to load configuration"
- Check Supabase connection
- Verify RLS policies allow reading `token_gate_config`

### "Token balance verification failed"
- Verify contract address is correct
- Check chain ID matches the network
- Ensure RPC endpoint is accessible

### "Rate limit not working"
- Verify `rate_limit_enabled = true`
- Check `free_scans_per_day` is set
- Ensure date is being tracked correctly in logs

### "Whitelist not working"
- Addresses must be lowercase
- Must be full 42-character addresses (0x + 40 hex chars)
- Check array syntax in database

## Future Enhancements

Potential additions to the token gate system:
- Multiple token contracts (AND/OR logic)
- Time-based access (subscription model)
- Tiered access levels (different balances = different scan limits)
- Web3 wallet integration UI
- Token holder dashboard
- Analytics for token holder vs free tier usage
