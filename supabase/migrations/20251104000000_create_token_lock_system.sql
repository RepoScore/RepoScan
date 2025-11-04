/*
  # Token Lock System

  1. New Tables
    - `token_locks`
      - `id` (uuid, primary key)
      - `wallet_address` (text, indexed) - User's wallet address
      - `token_amount` (bigint) - Amount of tokens locked (in smallest unit)
      - `lock_start_date` (timestamptz) - When the lock started
      - `lock_end_date` (timestamptz) - When the lock expires
      - `lock_duration_days` (integer) - Duration in days
      - `status` (text) - active, completed, withdrawn
      - `transaction_hash` (text) - Blockchain transaction hash
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `token_lock_tiers`
      - `id` (uuid, primary key)
      - `tier_name` (text) - Bronze, Silver, Gold, Platinum
      - `min_lock_amount` (bigint) - Minimum tokens required
      - `min_lock_days` (integer) - Minimum lock duration
      - `benefits` (jsonb) - Array of benefits
      - `discount_percentage` (integer) - Discount on scan fees
      - `priority_support` (boolean)
      - `api_rate_limit` (integer) - API calls per day
      - `created_at` (timestamptz)

    - `token_lock_rewards`
      - `id` (uuid, primary key)
      - `lock_id` (uuid, foreign key)
      - `reward_type` (text) - interest, bonus, referral
      - `reward_amount` (bigint)
      - `reward_date` (timestamptz)
      - `claimed` (boolean)
      - `claimed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `token_lock_history`
      - `id` (uuid, primary key)
      - `lock_id` (uuid, foreign key)
      - `action` (text) - created, extended, withdrawn, claimed
      - `previous_value` (jsonb)
      - `new_value` (jsonb)
      - `actor_address` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only view their own locks
    - Only authenticated users can create locks
    - Admin role can view all locks

  3. Indexes
    - Index on wallet_address for fast lookups
    - Index on status for filtering
    - Index on lock_end_date for expiry checks
*/

-- Create token_locks table
CREATE TABLE IF NOT EXISTS token_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  token_amount bigint NOT NULL CHECK (token_amount > 0),
  lock_start_date timestamptz NOT NULL DEFAULT now(),
  lock_end_date timestamptz NOT NULL,
  lock_duration_days integer NOT NULL CHECK (lock_duration_days > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  transaction_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create token_lock_tiers table
CREATE TABLE IF NOT EXISTS token_lock_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text NOT NULL UNIQUE,
  min_lock_amount bigint NOT NULL CHECK (min_lock_amount > 0),
  min_lock_days integer NOT NULL CHECK (min_lock_days > 0),
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  discount_percentage integer NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  priority_support boolean NOT NULL DEFAULT false,
  api_rate_limit integer NOT NULL DEFAULT 100 CHECK (api_rate_limit > 0),
  created_at timestamptz DEFAULT now()
);

-- Create token_lock_rewards table
CREATE TABLE IF NOT EXISTS token_lock_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id uuid NOT NULL REFERENCES token_locks(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('interest', 'bonus', 'referral', 'loyalty')),
  reward_amount bigint NOT NULL CHECK (reward_amount > 0),
  reward_date timestamptz NOT NULL DEFAULT now(),
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create token_lock_history table
CREATE TABLE IF NOT EXISTS token_lock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_id uuid NOT NULL REFERENCES token_locks(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'extended', 'withdrawn', 'claimed', 'expired')),
  previous_value jsonb,
  new_value jsonb,
  actor_address text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_token_locks_wallet ON token_locks(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_locks_status ON token_locks(status);
CREATE INDEX IF NOT EXISTS idx_token_locks_end_date ON token_locks(lock_end_date);
CREATE INDEX IF NOT EXISTS idx_token_lock_rewards_lock_id ON token_lock_rewards(lock_id);
CREATE INDEX IF NOT EXISTS idx_token_lock_rewards_claimed ON token_lock_rewards(claimed);
CREATE INDEX IF NOT EXISTS idx_token_lock_history_lock_id ON token_lock_history(lock_id);

-- Enable Row Level Security
ALTER TABLE token_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_lock_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_lock_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_lock_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for token_locks
CREATE POLICY "Users can view own token locks"
  ON token_locks FOR SELECT
  TO authenticated
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert own token locks"
  ON token_locks FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can update own token locks"
  ON token_locks FOR UPDATE
  TO authenticated
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address')
  WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for token_lock_tiers (public read)
CREATE POLICY "Anyone can view token lock tiers"
  ON token_lock_tiers FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for token_lock_rewards
CREATE POLICY "Users can view own rewards"
  ON token_lock_rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM token_locks
      WHERE token_locks.id = token_lock_rewards.lock_id
      AND token_locks.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

CREATE POLICY "Users can update own rewards"
  ON token_lock_rewards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM token_locks
      WHERE token_locks.id = token_lock_rewards.lock_id
      AND token_locks.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM token_locks
      WHERE token_locks.id = token_lock_rewards.lock_id
      AND token_locks.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- RLS Policies for token_lock_history
CREATE POLICY "Users can view own lock history"
  ON token_lock_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM token_locks
      WHERE token_locks.id = token_lock_history.lock_id
      AND token_locks.wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- Insert default tiers
INSERT INTO token_lock_tiers (tier_name, min_lock_amount, min_lock_days, benefits, discount_percentage, priority_support, api_rate_limit)
VALUES
  ('Bronze', 1000000000000000000, 30, '["Basic analytics", "Email support", "Standard scan speed"]'::jsonb, 5, false, 100),
  ('Silver', 5000000000000000000, 90, '["Advanced analytics", "Priority email support", "Faster scan speed", "API access"]'::jsonb, 10, false, 500),
  ('Gold', 10000000000000000000, 180, '["Premium analytics", "Priority support", "Fastest scan speed", "Advanced API access", "Early feature access"]'::jsonb, 20, true, 1000),
  ('Platinum', 50000000000000000000, 365, '["Enterprise analytics", "24/7 dedicated support", "Maximum scan speed", "Full API access", "Custom integrations", "Exclusive features"]'::jsonb, 30, true, 5000)
ON CONFLICT (tier_name) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_token_locks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS token_locks_updated_at ON token_locks;
CREATE TRIGGER token_locks_updated_at
  BEFORE UPDATE ON token_locks
  FOR EACH ROW
  EXECUTE FUNCTION update_token_locks_updated_at();

-- Function to create lock history entry
CREATE OR REPLACE FUNCTION create_token_lock_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO token_lock_history (lock_id, action, new_value, actor_address)
    VALUES (
      NEW.id,
      'created',
      jsonb_build_object(
        'token_amount', NEW.token_amount,
        'lock_duration_days', NEW.lock_duration_days,
        'lock_end_date', NEW.lock_end_date
      ),
      NEW.wallet_address
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO token_lock_history (lock_id, action, previous_value, new_value, actor_address)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.status = 'withdrawn' THEN 'withdrawn'
        WHEN NEW.lock_end_date > OLD.lock_end_date THEN 'extended'
        ELSE 'updated'
      END,
      jsonb_build_object(
        'token_amount', OLD.token_amount,
        'lock_duration_days', OLD.lock_duration_days,
        'lock_end_date', OLD.lock_end_date,
        'status', OLD.status
      ),
      jsonb_build_object(
        'token_amount', NEW.token_amount,
        'lock_duration_days', NEW.lock_duration_days,
        'lock_end_date', NEW.lock_end_date,
        'status', NEW.status
      ),
      NEW.wallet_address
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lock history
DROP TRIGGER IF EXISTS token_lock_history_trigger ON token_locks;
CREATE TRIGGER token_lock_history_trigger
  AFTER INSERT OR UPDATE ON token_locks
  FOR EACH ROW
  EXECUTE FUNCTION create_token_lock_history();
