import { supabase } from './supabase';

export interface TokenLock {
  id: string;
  wallet_address: string;
  token_amount: number;
  lock_start_date: string;
  lock_end_date: string;
  lock_duration_days: number;
  status: 'active' | 'completed' | 'withdrawn';
  transaction_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface TokenLockTier {
  id: string;
  tier_name: string;
  min_lock_amount: number;
  min_lock_days: number;
  benefits: string[];
  discount_percentage: number;
  priority_support: boolean;
  api_rate_limit: number;
  created_at: string;
}

export interface TokenLockReward {
  id: string;
  lock_id: string;
  reward_type: 'interest' | 'bonus' | 'referral' | 'loyalty';
  reward_amount: number;
  reward_date: string;
  claimed: boolean;
  claimed_at?: string;
  created_at: string;
}

export interface TokenLockHistory {
  id: string;
  lock_id: string;
  action: 'created' | 'extended' | 'withdrawn' | 'claimed' | 'expired';
  previous_value?: Record<string, any>;
  new_value?: Record<string, any>;
  actor_address: string;
  created_at: string;
}

export interface CreateTokenLockParams {
  wallet_address: string;
  token_amount: number;
  lock_duration_days: number;
  transaction_hash?: string;
}

export interface TokenLockStats {
  total_locked: number;
  active_locks_count: number;
  total_rewards_earned: number;
  current_tier?: TokenLockTier;
}

export class TokenLockService {
  static async getTiers(): Promise<TokenLockTier[]> {
    const { data, error } = await supabase
      .from('token_lock_tiers')
      .select('*')
      .order('min_lock_amount', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createLock(params: CreateTokenLockParams): Promise<TokenLock> {
    const lockEndDate = new Date();
    lockEndDate.setDate(lockEndDate.getDate() + params.lock_duration_days);

    const { data, error } = await supabase
      .from('token_locks')
      .insert({
        wallet_address: params.wallet_address,
        token_amount: params.token_amount,
        lock_duration_days: params.lock_duration_days,
        lock_end_date: lockEndDate.toISOString(),
        transaction_hash: params.transaction_hash,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserLocks(walletAddress: string): Promise<TokenLock[]> {
    const { data, error } = await supabase
      .from('token_locks')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getActiveLocks(walletAddress: string): Promise<TokenLock[]> {
    const { data, error } = await supabase
      .from('token_locks')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('status', 'active')
      .order('lock_end_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getLockById(lockId: string): Promise<TokenLock | null> {
    const { data, error } = await supabase
      .from('token_locks')
      .select('*')
      .eq('id', lockId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async withdrawLock(lockId: string, walletAddress: string): Promise<void> {
    const { error } = await supabase
      .from('token_locks')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', lockId)
      .eq('wallet_address', walletAddress);

    if (error) throw error;
  }

  static async extendLock(
    lockId: string,
    additionalDays: number,
    walletAddress: string
  ): Promise<TokenLock> {
    const lock = await this.getLockById(lockId);
    if (!lock) throw new Error('Lock not found');
    if (lock.wallet_address !== walletAddress) throw new Error('Unauthorized');

    const newEndDate = new Date(lock.lock_end_date);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    const newDuration = lock.lock_duration_days + additionalDays;

    const { data, error } = await supabase
      .from('token_locks')
      .update({
        lock_end_date: newEndDate.toISOString(),
        lock_duration_days: newDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', lockId)
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getLockRewards(lockId: string): Promise<TokenLockReward[]> {
    const { data, error } = await supabase
      .from('token_lock_rewards')
      .select('*')
      .eq('lock_id', lockId)
      .order('reward_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async claimReward(rewardId: string): Promise<void> {
    const { error } = await supabase
      .from('token_lock_rewards')
      .update({ claimed: true, claimed_at: new Date().toISOString() })
      .eq('id', rewardId)
      .eq('claimed', false);

    if (error) throw error;
  }

  static async getLockHistory(lockId: string): Promise<TokenLockHistory[]> {
    const { data, error } = await supabase
      .from('token_lock_history')
      .select('*')
      .eq('lock_id', lockId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getUserStats(walletAddress: string): Promise<TokenLockStats> {
    const locks = await this.getActiveLocks(walletAddress);

    const totalLocked = locks.reduce((sum, lock) => sum + Number(lock.token_amount), 0);
    const activeLockCount = locks.length;

    const { data: rewardsData } = await supabase
      .from('token_lock_rewards')
      .select('reward_amount')
      .in('lock_id', locks.map(l => l.id))
      .eq('claimed', true);

    const totalRewards = rewardsData?.reduce((sum, r) => sum + Number(r.reward_amount), 0) || 0;

    const tiers = await this.getTiers();
    const currentTier = this.calculateUserTier(totalLocked, locks, tiers);

    return {
      total_locked: totalLocked,
      active_locks_count: activeLockCount,
      total_rewards_earned: totalRewards,
      current_tier: currentTier
    };
  }

  static calculateUserTier(
    totalLocked: number,
    locks: TokenLock[],
    tiers: TokenLockTier[]
  ): TokenLockTier | undefined {
    if (locks.length === 0) return undefined;

    const maxLockDays = Math.max(...locks.map(l => l.lock_duration_days));

    const eligibleTiers = tiers.filter(
      tier => totalLocked >= tier.min_lock_amount && maxLockDays >= tier.min_lock_days
    );

    return eligibleTiers.length > 0
      ? eligibleTiers[eligibleTiers.length - 1]
      : undefined;
  }

  static isLockExpired(lock: TokenLock): boolean {
    return new Date(lock.lock_end_date) < new Date();
  }

  static getRemainingDays(lock: TokenLock): number {
    const now = new Date();
    const endDate = new Date(lock.lock_end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  static formatTokenAmount(amount: number): string {
    return (amount / 1e18).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  }
}
