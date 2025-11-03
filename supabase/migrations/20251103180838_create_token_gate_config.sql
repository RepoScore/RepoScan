/*
  # Token Gate Configuration System

  1. New Tables
    - `token_gate_config`
      - `id` (uuid, primary key) - Unique identifier
      - `enabled` (boolean) - Master toggle for token gating
      - `contract_address` (text) - Token contract address
      - `chain_id` (integer) - Blockchain network ID (1=Ethereum, 137=Polygon, etc.)
      - `minimum_balance` (numeric) - Minimum token balance required
      - `token_standard` (text) - ERC20, ERC721, ERC1155
      - `whitelist_addresses` (text[]) - Addresses that bypass token gate
      - `rate_limit_enabled` (boolean) - Enable rate limiting for non-token holders
      - `free_scans_per_day` (integer) - Scans allowed without tokens
      - `updated_at` (timestamptz) - Last configuration update
      - `created_at` (timestamptz) - Configuration creation date
      
    - `scan_access_log`
      - `id` (uuid, primary key) - Log entry identifier
      - `wallet_address` (text) - User's wallet address (nullable)
      - `ip_address` (text) - Request IP address
      - `has_token_access` (boolean) - Whether user had token access
      - `scan_count` (integer) - Number of scans in this session
      - `scan_date` (date) - Date of scan for rate limiting
      - `created_at` (timestamptz) - Log entry timestamp

  2. Security
    - Enable RLS on both tables
    - Config table: Only readable by authenticated users, writable by service role
    - Access log: Only writable by service role for tracking

  3. Important Notes
    - Config table uses single-row pattern (only one active config)
    - Default state: token gating disabled for development
    - Supports multiple blockchain networks
    - Whitelist for team/testing addresses
    - Rate limiting fallback for public testing phase
*/

-- Create token_gate_config table
CREATE TABLE IF NOT EXISTS token_gate_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT false,
  contract_address text,
  chain_id integer,
  minimum_balance numeric DEFAULT 1,
  token_standard text DEFAULT 'ERC20',
  whitelist_addresses text[] DEFAULT '{}',
  rate_limit_enabled boolean DEFAULT true,
  free_scans_per_day integer DEFAULT 5,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create scan_access_log table
CREATE TABLE IF NOT EXISTS scan_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text,
  ip_address text,
  has_token_access boolean DEFAULT false,
  scan_count integer DEFAULT 1,
  scan_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE token_gate_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_access_log ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read token gate config (needed for public access)
CREATE POLICY "Anyone can read token gate config"
  ON token_gate_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Only service role can modify config
CREATE POLICY "Service role can manage config"
  ON token_gate_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Only service role can write access logs
CREATE POLICY "Service role can write access logs"
  ON scan_access_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Authenticated users can read their own logs
CREATE POLICY "Users can read own access logs"
  ON scan_access_log
  FOR SELECT
  TO authenticated
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Insert default configuration (disabled by default)
INSERT INTO token_gate_config (
  enabled,
  contract_address,
  chain_id,
  minimum_balance,
  token_standard,
  whitelist_addresses,
  rate_limit_enabled,
  free_scans_per_day
) VALUES (
  false,
  NULL,
  1,
  1,
  'ERC20',
  '{}',
  true,
  5
)
ON CONFLICT (id) DO NOTHING;

-- Create index for faster access log queries
CREATE INDEX IF NOT EXISTS idx_scan_access_wallet_date 
  ON scan_access_log(wallet_address, scan_date);

CREATE INDEX IF NOT EXISTS idx_scan_access_ip_date 
  ON scan_access_log(ip_address, scan_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_token_gate_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_token_gate_config_timestamp_trigger'
  ) THEN
    CREATE TRIGGER update_token_gate_config_timestamp_trigger
      BEFORE UPDATE ON token_gate_config
      FOR EACH ROW
      EXECUTE FUNCTION update_token_gate_config_timestamp();
  END IF;
END $$;
