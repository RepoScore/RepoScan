# Token Lock System Documentation

## Overview

The Token Lock System is a comprehensive staking mechanism that allows REPOSCAN token holders to lock their tokens for specified periods in exchange for rewards and tier-based benefits.

## Status: Development Complete - Integration Pending

The token lock mechanism has been fully built and is ready for integration once the smart contract is deployed. All frontend components, database schema, and service logic are in place.

## Architecture

### Database Schema

The system uses four main tables:

1. **token_locks**: Core table storing lock information
   - User wallet address
   - Token amount locked
   - Lock duration and dates
   - Status (active, completed, withdrawn)
   - Transaction hash

2. **token_lock_tiers**: Predefined tier levels with benefits
   - Bronze, Silver, Gold, Platinum tiers
   - Minimum lock amounts and durations
   - Discount percentages
   - API rate limits
   - Priority support flags

3. **token_lock_rewards**: Tracks rewards earned
   - Lock reference
   - Reward type (interest, bonus, referral, loyalty)
   - Claimed status

4. **token_lock_history**: Audit log of all actions
   - Lock lifecycle tracking
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

- `getTiers()`: Fetch all available tiers
- `createLock()`: Create a new token lock
- `getUserLocks()`: Get user's lock history
- `getActiveLocks()`: Get user's active locks
- `withdrawLock()`: Withdraw tokens from lock
- `extendLock()`: Extend lock duration
- `getLockRewards()`: Get rewards for a lock
- `claimReward()`: Claim earned rewards
- `getUserStats()`: Get comprehensive user statistics
- Helper methods for formatting and calculations

## Tier System

### Bronze Tier
- **Minimum Lock**: 1 token for 30 days
- **Benefits**: 5% discount, basic analytics, email support
- **API Rate Limit**: 100 calls/day

### Silver Tier
- **Minimum Lock**: 5 tokens for 90 days
- **Benefits**: 10% discount, advanced analytics, priority email, API access
- **API Rate Limit**: 500 calls/day

### Gold Tier
- **Minimum Lock**: 10 tokens for 180 days
- **Benefits**: 20% discount, premium analytics, priority support, early features
- **API Rate Limit**: 1,000 calls/day

### Platinum Tier
- **Minimum Lock**: 50 tokens for 365 days
- **Benefits**: 30% discount, enterprise analytics, 24/7 support, custom integrations
- **API Rate Limit**: 5,000 calls/day

## Components

### TokenLockDashboard (`src/components/TokenLockDashboard.tsx`)

User-facing component showing:
- Wallet connection requirement
- Statistics dashboard (total locked, active locks, rewards earned, current tier)
- Visual tier cards with benefits
- Lock creation interface (disabled until contract deployment)
- Active locks list with remaining time
- Status indicators

### TokenLockAdmin (`src/components/TokenLockAdmin.tsx`)

Administrative interface for:
- System-wide statistics
- Tier management (view/edit)
- Configuration settings
- User monitoring
- Currently disabled for modifications until contract is live

## Integration Checklist

When ready to activate the token lock system:

### 1. Smart Contract Deployment
- [ ] Deploy ERC-20 token contract
- [ ] Deploy token lock contract
- [ ] Verify contracts on block explorer
- [ ] Test lock/unlock functionality
- [ ] Test reward distribution

### 2. Frontend Integration
- [ ] Update contract address in environment variables
- [ ] Connect Web3 provider
- [ ] Implement token approval flow
- [ ] Connect lock creation to smart contract
- [ ] Connect withdrawal to smart contract
- [ ] Implement reward claiming
- [ ] Add transaction status monitoring

### 3. Database Updates
- [ ] Run migration: `20251104000000_create_token_lock_system.sql`
- [ ] Verify RLS policies
- [ ] Test tier queries
- [ ] Verify triggers are working

### 4. Testing
- [ ] Test lock creation flow
- [ ] Test lock extension
- [ ] Test withdrawal
- [ ] Test reward claiming
- [ ] Test tier calculations
- [ ] Test permission boundaries
- [ ] Load testing with multiple users

### 5. UI/UX Activation
- [ ] Enable lock creation form
- [ ] Enable admin controls
- [ ] Add real-time transaction feedback
- [ ] Add wallet balance checks
- [ ] Implement error handling for failed transactions
- [ ] Add success notifications

## Environment Variables

Add these to `.env` when ready to activate:

```env
VITE_TOKEN_CONTRACT_ADDRESS=0x...
VITE_LOCK_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=1
VITE_TOKEN_LOCK_ENABLED=false
```

## API Endpoints

The system uses Supabase's auto-generated REST API:

- `GET /token_lock_tiers` - Fetch all tiers
- `GET /token_locks?wallet_address=eq.{address}` - Get user locks
- `POST /token_locks` - Create new lock
- `PATCH /token_locks?id=eq.{id}` - Update lock
- `GET /token_lock_rewards?lock_id=eq.{id}` - Get rewards
- `PATCH /token_lock_rewards` - Claim reward

## Usage Example

```typescript
import { TokenLockService } from './lib/tokenLock';

// Get all tiers
const tiers = await TokenLockService.getTiers();

// Create a lock (requires smart contract integration)
const lock = await TokenLockService.createLock({
  wallet_address: userAddress,
  token_amount: 10000000000000000000, // 10 tokens in wei
  lock_duration_days: 90,
  transaction_hash: txHash
});

// Get user stats
const stats = await TokenLockService.getUserStats(userAddress);
console.log(`Total locked: ${stats.total_locked}`);
console.log(`Current tier: ${stats.current_tier?.tier_name}`);
```

## Reward Calculation

Rewards are calculated based on:
- Lock duration (longer = better rates)
- Lock amount (more tokens = more rewards)
- Tier level (higher tiers get bonus multipliers)
- Loyalty bonuses for long-term holders

## Future Enhancements

- [ ] NFT badges for tier achievements
- [ ] Referral rewards system
- [ ] Auto-compound rewards option
- [ ] Lock portfolio analytics
- [ ] Mobile app support
- [ ] Social sharing features
- [ ] Leaderboard for top lockers

## Support

For questions about the token lock system:
- Documentation: This file
- Technical issues: Check database logs and RLS policies
- Smart contract issues: Review contract events and transactions

## License

MIT License - See LICENSE file for details
