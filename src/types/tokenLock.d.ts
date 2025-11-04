export interface TokenLockConfig {
  contract_address?: string;
  token_address?: string;
  min_lock_amount: number;
  max_lock_amount: number;
  min_lock_days: number;
  max_lock_days: number;
  early_withdrawal_penalty: number;
  enabled: boolean;
}

export interface TokenLockTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  block_number?: number;
}

export interface TokenLockNotification {
  id: string;
  user_address: string;
  type: 'lock_created' | 'lock_expiring' | 'lock_expired';
  message: string;
  read: boolean;
  created_at: string;
}
