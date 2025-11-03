/*
  # Fix Security and Performance Issues

  1. RLS Performance Optimization
    - Update RLS policy on `scan_access_log` to use subquery for better performance
    - Replace current_setting() with (select current_setting()) pattern

  2. Remove Unused Indexes
    - Drop `idx_repo_scans_github_url` (not used)
    - Drop `idx_repo_scans_scan_date` (not used)
    - Drop `idx_scan_access_wallet_date` (not used)
    - Drop `idx_scan_access_ip_date` (not used)

  3. Fix Function Security
    - Recreate `update_token_gate_config_timestamp` function with immutable search_path
*/

-- Drop and recreate the RLS policy with optimized performance
DROP POLICY IF EXISTS "Users can read own access logs" ON scan_access_log;

CREATE POLICY "Users can read own access logs"
  ON scan_access_log
  FOR SELECT
  TO authenticated
  USING (
    wallet_address = (
      SELECT (current_setting('request.jwt.claims', true)::json ->> 'wallet_address')
    )
  );

-- Remove unused indexes
DROP INDEX IF EXISTS idx_repo_scans_github_url;
DROP INDEX IF EXISTS idx_repo_scans_scan_date;
DROP INDEX IF EXISTS idx_scan_access_wallet_date;
DROP INDEX IF EXISTS idx_scan_access_ip_date;

-- Recreate function with secure search_path
DROP FUNCTION IF EXISTS update_token_gate_config_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_token_gate_config_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_token_gate_config_timestamp ON token_gate_config;

CREATE TRIGGER update_token_gate_config_timestamp
  BEFORE UPDATE ON token_gate_config
  FOR EACH ROW
  EXECUTE FUNCTION update_token_gate_config_timestamp();
