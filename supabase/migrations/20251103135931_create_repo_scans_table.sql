/*
  # Create Repository Scans Table

  1. New Tables
    - `repo_scans`
      - `id` (uuid, primary key) - Unique identifier for each scan
      - `github_url` (text, not null) - The GitHub repository URL
      - `repo_name` (text) - Extracted repository name (owner/repo)
      - `safety_score` (integer) - Safety score from 0-100
      - `legitimacy_score` (integer) - Legitimacy score from 0-100
      - `analysis_summary` (text) - Brief summary of the analysis
      - `risk_factors` (jsonb) - Array of identified risk factors
      - `positive_indicators` (jsonb) - Array of positive indicators
      - `scan_date` (timestamptz) - When the scan was performed
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `repo_scans` table
    - Add policy for anyone to insert new scans (public service)
    - Add policy for anyone to read scans (public access to results)

  3. Indexes
    - Index on `github_url` for quick lookups
    - Index on `scan_date` for recent scans queries
*/

CREATE TABLE IF NOT EXISTS repo_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_url text NOT NULL,
  repo_name text,
  safety_score integer CHECK (safety_score >= 0 AND safety_score <= 100),
  legitimacy_score integer CHECK (legitimacy_score >= 0 AND legitimacy_score <= 100),
  analysis_summary text,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  positive_indicators jsonb DEFAULT '[]'::jsonb,
  scan_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_repo_scans_github_url ON repo_scans(github_url);
CREATE INDEX IF NOT EXISTS idx_repo_scans_scan_date ON repo_scans(scan_date DESC);

-- Enable Row Level Security
ALTER TABLE repo_scans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert new scans (public service)
CREATE POLICY "Anyone can create repo scans"
  ON repo_scans
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to read scan results (public access)
CREATE POLICY "Anyone can view repo scans"
  ON repo_scans
  FOR SELECT
  TO anon, authenticated
  USING (true);