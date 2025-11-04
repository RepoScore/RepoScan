# Token Lock System Documentation

## Overview

The Token Lock System allows REPOSCAN SPL token holders to lock tokens for unlimited platform access. This is a simple, single-tier system where users lock 1,000,000 REPOSCAN tokens for 30 days to gain full access to all platform features.

## Status: Development Complete - Integration Pending

The token lock mechanism has been fully built and is ready for integration once the Solana smart contract is deployed. All frontend components, database schema, and service logic are in place.

## Token Lock Requirements

**Single Access Tier:**
- **Lock Amount**: 1,000,000 REPOSCAN SPL tokens
- **Lock Duration**: 30 days
- **Benefit**: Unlimited access to all RepoScan features

**Important Notes:**
- No tiered system - all users get the same unlimited access
- No rewards, interest, or token generation
- No referral bonuses or loyalty programs
- Lock is time-based only - tokens are returned after 30 days
- SPL tokens on Solana blockchain (NOT ERC-20)

## Architecture

### Database Schema

The system uses four main tables:

1. **token_locks**: Core table storing lock information
   - User wallet address (Solana wallet)
   - Token amount locked (always 1,000,000 tokens)
   - Lock duration (always 30 days)
   - Lock start and end dates
   - Status (active, completed, withdrawn)
   - Transaction hash (Solana transaction signature)

2. **token_lock_tiers**: Single tier configuration
   - Stores the single "Unlimited Access" tier
   - Required amount: 1,000,000 tokens
   - Required duration: 30 days
   - No discounts or rate limits - just unlimited access

3. **token_lock_rewards**: Not used (kept for database compatibility)
   - RepoScan does not distribute rewards
   - Table exists but will remain empty

4. **token_lock_history**: Audit log of all actions
   - Lock lifecycle tracking (created, expired, withdrawn)
   - Previous and new values
   - Actor addresses

### Security Features

- **Row Level Security (RLS)**: All tables have RLS enabled
- Users can only view/modify their own locks
- Public read access to tier information
- Automated history tracking via triggers
- Secure wallet address verification

### Service Layer (`src/lib/tokenLock.ts`)

The `TokenLockService` class provides:

- `getTiers()`: Fetch tier configuration (single tier)
- `createLock()`: Create a new 30-day token lock
- `getUserLocks()`: Get user's lock history
- `getActiveLocks()`: Get user's active locks
- `withdrawLock()`: Withdraw tokens after lock expires
- `getLockHistory()`: Get audit trail for locks
- `getUserStats()`: Get user lock statistics
- `isLockExpired()`: Check if lock period has ended
- `getRemainingDays()`: Calculate days remaining in lock period

**Note**: Methods like `extendLock()`, `getLockRewards()`, and `claimReward()` exist for database compatibility but are not used in RepoScan's simple lock system.

## Access System

### Unlimited Access Tier

**Requirements:**
- Lock 1,000,000 REPOSCAN SPL tokens
- Lock period: 30 days

**Benefits:**
- Full access to all RepoScan features:
  - Unlimited repository scans
  - Deep scan with Claude AI
  - Vulnerability reports
  - Code quality analysis
  - Chrome extension premium features
  - API access (no rate limits)
  - Priority support

**No Additional Benefits:**
- No token rewards or interest
- No discount percentages
- No tier progression
- No referral bonuses
- All users with active locks have identical access

## Components

### TokenLockDashboard (`src/components/TokenLockDashboard.tsx`)

User-facing component showing:
- Wallet connection requirement
- Current lock status and remaining days
- Lock creation interface (disabled until Solana contract deployment)
- Active lock details
- "Coming Soon" indicators

### TokenLockAdmin (`src/components/TokenLockAdmin.tsx`)

Administrative interface for:
- System-wide statistics (total locks, total value locked, active users)
- Lock monitoring
- Configuration settings
- Currently disabled for modifications until contract is live

## Integration Checklist

When ready to activate the token lock system:

### 1. Solana Smart Contract Deployment
- [ ] Deploy REPOSCAN SPL token contract
- [ ] Deploy token lock program on Solana
- [ ] Verify program on Solana Explorer
- [ ] Test lock/unlock functionality
- [ ] Verify 30-day time lock mechanism

### 2. Frontend Integration
- [ ] Update program address in environment variables
- [ ] Connect Solana wallet adapter (Phantom, Solflare, etc.)
- [ ] Implement SPL token approval flow
- [ ] Connect lock creation to Solana program
- [ ] Connect withdrawal to Solana program
- [ ] Add transaction status monitoring
- [ ] Display Solana transaction signatures

### 3. Database Updates
- [ ] Run migration: `20251104000000_create_token_lock_system.sql`
- [ ] Verify RLS policies
- [ ] Verify triggers are working
- [ ] Update tier table with single "Unlimited Access" tier

### 4. Testing
- [ ] Test lock creation flow
- [ ] Test 30-day expiration
- [ ] Test withdrawal after expiration
- [ ] Test access control (locked users get unlimited access)
- [ ] Test permission boundaries
- [ ] Load testing with multiple users

### 5. UI/UX Activation
- [ ] Enable lock creation form
- [ ] Add real-time transaction feedback
- [ ] Add wallet balance checks (verify 1M tokens available)
- [ ] Implement error handling for failed transactions
- [ ] Add success notifications
- [ ] Show remaining lock days

## Environment Variables

Add these to `.env` when ready to activate:

```env
VITE_SOLANA_NETWORK=mainnet-beta
VITE_REPOSCAN_TOKEN_MINT=<SPL_token_mint_address>
VITE_LOCK_PROGRAM_ID=<Solana_program_id>
VITE_TOKEN_LOCK_ENABLED=false
```

## API Endpoints

The system uses Supabase's auto-generated REST API:

- `GET /token_lock_tiers` - Fetch tier configuration
- `GET /token_locks?wallet_address=eq.{address}` - Get user locks
- `POST /token_locks` - Create new lock
- `PATCH /token_locks?id=eq.{id}` - Update lock status
- `GET /token_lock_history?lock_id=eq.{id}` - Get lock history

## Usage Example

```typescript
import { TokenLockService } from './lib/tokenLock';

// Create a lock (requires Solana smart contract integration)
const lock = await TokenLockService.createLock({
  wallet_address: solanaWalletAddress,
  token_amount: 1000000000000, // 1M tokens (with decimals)
  lock_duration_days: 30,
  transaction_hash: solanaSignature
});

// Check if user has active lock
const activeLocks = await TokenLockService.getActiveLocks(walletAddress);
const hasAccess = activeLocks.length > 0;

// Get days remaining
if (activeLocks.length > 0) {
  const daysRemaining = TokenLockService.getRemainingDays(activeLocks[0]);
  console.log(`Access expires in ${daysRemaining} days`);
}
```

## Access Control

The platform checks for active token locks to grant access:

```typescript
// Check if user has unlimited access
async function hasUnlimitedAccess(walletAddress: string): Promise<boolean> {
  const activeLocks = await TokenLockService.getActiveLocks(walletAddress);

  // User needs at least one active lock for access
  return activeLocks.length > 0;
}
```

## What This System Does NOT Do

To be absolutely clear, RepoScan's token lock system:

- ❌ Does NOT generate rewards, interest, or yield
- ❌ Does NOT have multiple tiers (Bronze, Silver, Gold, etc.)
- ❌ Does NOT offer referral bonuses
- ❌ Does NOT have loyalty programs
- ❌ Does NOT use ERC-20 tokens (uses SPL tokens on Solana)
- ❌ Does NOT auto-compound anything
- ❌ Does NOT provide discount percentages
- ❌ Does NOT have variable lock durations (always 30 days)
- ❌ Does NOT have variable lock amounts (always 1M tokens)
- ❌ Does NOT allow lock extension
- ❌ Does NOT have NFT badges or achievements

## What This System DOES Do

RepoScan's token lock system:

- ✅ Locks exactly 1,000,000 REPOSCAN SPL tokens
- ✅ Locks for exactly 30 days
- ✅ Grants unlimited access to all platform features during lock period
- ✅ Returns tokens automatically after 30 days
- ✅ Tracks lock history for audit purposes
- ✅ Uses Solana blockchain and SPL token standard
- ✅ Enforces time-based access control

## Platform Features Unlocked by Token Lock

With an active token lock, users get:

1. **Unlimited Repository Scans**
   - No daily or monthly limits
   - Scan any GitHub repository
   - Full vulnerability reports

2. **Deep Scan with Claude AI**
   - Advanced AI-powered code analysis
   - Architecture insights
   - Performance recommendations

3. **Chrome Extension Premium**
   - All extension features unlocked
   - Instant scan results on GitHub

4. **API Access**
   - Full REST API access
   - No rate limiting
   - Programmatic scanning

5. **Priority Support**
   - Faster response times
   - Direct support channel

## Support

For questions about the token lock system:
- Documentation: This file
- Technical issues: Check database logs and RLS policies
- Smart contract issues: Review Solana Explorer for transaction status
- Wallet issues: Ensure using Solana-compatible wallet (Phantom, Solflare)

## License

MIT License - See LICENSE file for details

---

**Remember**: This is a simple access control system, not a DeFi yield product. Lock tokens → Get access → Tokens returned after 30 days.
