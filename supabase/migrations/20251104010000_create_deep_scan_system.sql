/*
  # Deep Scan System with Claude AI Integration

  1. New Tables
    - `deep_scans`
      - `id` (uuid, primary key)
      - `repo_scan_id` (uuid, foreign key) - Links to basic repo scan
      - `repository_url` (text)
      - `initiated_by` (text) - Wallet address
      - `status` (text) - pending, processing, completed, failed
      - `scan_type` (text) - full, security_focused, architecture, code_quality
      - `total_files_analyzed` (integer)
      - `total_lines_analyzed` (integer)
      - `claude_tokens_used` (integer)
      - `scan_duration_seconds` (integer)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `deep_scan_findings`
      - `id` (uuid, primary key)
      - `deep_scan_id` (uuid, foreign key)
      - `category` (text) - security, architecture, code_quality, performance, maintainability
      - `severity` (text) - critical, high, medium, low, info
      - `title` (text)
      - `description` (text)
      - `file_path` (text)
      - `line_number` (integer)
      - `code_snippet` (text)
      - `recommendation` (text)
      - `confidence_score` (numeric) - 0-100
      - `ai_explanation` (text)
      - `created_at` (timestamptz)

    - `deep_scan_insights`
      - `id` (uuid, primary key)
      - `deep_scan_id` (uuid, foreign key)
      - `insight_type` (text) - architecture_pattern, design_flaw, best_practice, optimization
      - `title` (text)
      - `description` (text)
      - `impact` (text) - high, medium, low
      - `effort_to_fix` (text) - high, medium, low
      - `affected_files` (jsonb) - Array of file paths
      - `code_examples` (jsonb)
      - `recommendations` (jsonb)
      - `created_at` (timestamptz)

    - `deep_scan_metrics`
      - `id` (uuid, primary key)
      - `deep_scan_id` (uuid, foreign key)
      - `metric_name` (text)
      - `metric_value` (numeric)
      - `metric_unit` (text)
      - `category` (text)
      - `threshold_status` (text) - pass, warning, fail
      - `context` (jsonb)
      - `created_at` (timestamptz)

    - `deep_scan_reports`
      - `id` (uuid, primary key)
      - `deep_scan_id` (uuid, foreign key)
      - `report_type` (text) - executive_summary, technical_details, remediation_plan
      - `content` (text)
      - `generated_at` (timestamptz)
      - `format` (text) - markdown, html, json

    - `deep_scan_comparisons`
      - `id` (uuid, primary key)
      - `scan_id_1` (uuid, foreign key)
      - `scan_id_2` (uuid, foreign key)
      - `comparison_summary` (text)
      - `improvements` (jsonb)
      - `regressions` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view scans they initiated
    - Admin can view all scans

  3. Indexes
    - Index on repository_url for lookups
    - Index on initiated_by for user queries
    - Index on status for filtering
    - Index on deep_scan_id for related queries
*/

-- Create deep_scans table
CREATE TABLE IF NOT EXISTS deep_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_scan_id uuid REFERENCES repo_scans(id) ON DELETE SET NULL,
  repository_url text NOT NULL,
  initiated_by text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  scan_type text NOT NULL DEFAULT 'full' CHECK (scan_type IN ('full', 'security_focused', 'architecture', 'code_quality', 'performance')),
  total_files_analyzed integer DEFAULT 0,
  total_lines_analyzed integer DEFAULT 0,
  claude_tokens_used integer DEFAULT 0,
  scan_duration_seconds integer,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create deep_scan_findings table
CREATE TABLE IF NOT EXISTS deep_scan_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deep_scan_id uuid NOT NULL REFERENCES deep_scans(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('security', 'architecture', 'code_quality', 'performance', 'maintainability', 'documentation')),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title text NOT NULL,
  description text NOT NULL,
  file_path text,
  line_number integer,
  code_snippet text,
  recommendation text NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 100),
  ai_explanation text,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create deep_scan_insights table
CREATE TABLE IF NOT EXISTS deep_scan_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deep_scan_id uuid NOT NULL REFERENCES deep_scans(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('architecture_pattern', 'design_flaw', 'best_practice', 'optimization', 'technical_debt')),
  title text NOT NULL,
  description text NOT NULL,
  impact text NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  effort_to_fix text NOT NULL CHECK (effort_to_fix IN ('high', 'medium', 'low')),
  affected_files jsonb DEFAULT '[]'::jsonb,
  code_examples jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  priority_score integer CHECK (priority_score >= 0 AND priority_score <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create deep_scan_metrics table
CREATE TABLE IF NOT EXISTS deep_scan_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deep_scan_id uuid NOT NULL REFERENCES deep_scans(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  category text NOT NULL,
  threshold_status text CHECK (threshold_status IN ('pass', 'warning', 'fail')),
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create deep_scan_reports table
CREATE TABLE IF NOT EXISTS deep_scan_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deep_scan_id uuid NOT NULL REFERENCES deep_scans(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('executive_summary', 'technical_details', 'remediation_plan', 'comparison')),
  content text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  format text NOT NULL DEFAULT 'markdown' CHECK (format IN ('markdown', 'html', 'json', 'pdf'))
);

-- Create deep_scan_comparisons table
CREATE TABLE IF NOT EXISTS deep_scan_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id_1 uuid NOT NULL REFERENCES deep_scans(id) ON DELETE CASCADE,
  scan_id_2 uuid NOT NULL REFERENCES deep_scans(id) ON DELETE CASCADE,
  comparison_summary text NOT NULL,
  improvements jsonb DEFAULT '[]'::jsonb,
  regressions jsonb DEFAULT '[]'::jsonb,
  unchanged_areas jsonb DEFAULT '[]'::jsonb,
  overall_trend text CHECK (overall_trend IN ('improved', 'declined', 'stable')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_scans CHECK (scan_id_1 != scan_id_2)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deep_scans_repo_url ON deep_scans(repository_url);
CREATE INDEX IF NOT EXISTS idx_deep_scans_initiated_by ON deep_scans(initiated_by);
CREATE INDEX IF NOT EXISTS idx_deep_scans_status ON deep_scans(status);
CREATE INDEX IF NOT EXISTS idx_deep_scans_created_at ON deep_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deep_scan_findings_scan_id ON deep_scan_findings(deep_scan_id);
CREATE INDEX IF NOT EXISTS idx_deep_scan_findings_severity ON deep_scan_findings(severity);
CREATE INDEX IF NOT EXISTS idx_deep_scan_findings_category ON deep_scan_findings(category);
CREATE INDEX IF NOT EXISTS idx_deep_scan_insights_scan_id ON deep_scan_insights(deep_scan_id);
CREATE INDEX IF NOT EXISTS idx_deep_scan_insights_impact ON deep_scan_insights(impact);
CREATE INDEX IF NOT EXISTS idx_deep_scan_metrics_scan_id ON deep_scan_metrics(deep_scan_id);
CREATE INDEX IF NOT EXISTS idx_deep_scan_reports_scan_id ON deep_scan_reports(deep_scan_id);

-- Enable Row Level Security
ALTER TABLE deep_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_scan_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_scan_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_scan_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_scan_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_scan_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deep_scans
CREATE POLICY "Users can view own deep scans"
  ON deep_scans FOR SELECT
  TO authenticated
  USING (initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert own deep scans"
  ON deep_scans FOR INSERT
  TO authenticated
  WITH CHECK (initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can update own deep scans"
  ON deep_scans FOR UPDATE
  TO authenticated
  USING (initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address')
  WITH CHECK (initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for deep_scan_findings
CREATE POLICY "Users can view findings from own scans"
  ON deep_scan_findings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deep_scans
      WHERE deep_scans.id = deep_scan_findings.deep_scan_id
      AND deep_scans.initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- RLS Policies for deep_scan_insights
CREATE POLICY "Users can view insights from own scans"
  ON deep_scan_insights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deep_scans
      WHERE deep_scans.id = deep_scan_insights.deep_scan_id
      AND deep_scans.initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- RLS Policies for deep_scan_metrics
CREATE POLICY "Users can view metrics from own scans"
  ON deep_scan_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deep_scans
      WHERE deep_scans.id = deep_scan_metrics.deep_scan_id
      AND deep_scans.initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- RLS Policies for deep_scan_reports
CREATE POLICY "Users can view reports from own scans"
  ON deep_scan_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deep_scans
      WHERE deep_scans.id = deep_scan_reports.deep_scan_id
      AND deep_scans.initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- RLS Policies for deep_scan_comparisons
CREATE POLICY "Users can view comparisons of own scans"
  ON deep_scan_comparisons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deep_scans
      WHERE (deep_scans.id = deep_scan_comparisons.scan_id_1 OR deep_scans.id = deep_scan_comparisons.scan_id_2)
      AND deep_scans.initiated_by = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- Function to automatically set started_at when status changes to processing
CREATE OR REPLACE FUNCTION update_deep_scan_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
    NEW.started_at = now();
  END IF;

  IF (NEW.status = 'completed' OR NEW.status = 'failed') AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
    IF NEW.started_at IS NOT NULL THEN
      NEW.scan_duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::integer;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deep scan timing
DROP TRIGGER IF EXISTS deep_scan_timing_trigger ON deep_scans;
CREATE TRIGGER deep_scan_timing_trigger
  BEFORE UPDATE ON deep_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_deep_scan_started_at();

-- Function to calculate priority score for insights
CREATE OR REPLACE FUNCTION calculate_insight_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score = CASE
    WHEN NEW.impact = 'high' AND NEW.effort_to_fix = 'low' THEN 90
    WHEN NEW.impact = 'high' AND NEW.effort_to_fix = 'medium' THEN 80
    WHEN NEW.impact = 'high' AND NEW.effort_to_fix = 'high' THEN 70
    WHEN NEW.impact = 'medium' AND NEW.effort_to_fix = 'low' THEN 60
    WHEN NEW.impact = 'medium' AND NEW.effort_to_fix = 'medium' THEN 50
    WHEN NEW.impact = 'medium' AND NEW.effort_to_fix = 'high' THEN 40
    WHEN NEW.impact = 'low' AND NEW.effort_to_fix = 'low' THEN 30
    WHEN NEW.impact = 'low' AND NEW.effort_to_fix = 'medium' THEN 20
    ELSE 10
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for insight priority calculation
DROP TRIGGER IF EXISTS insight_priority_trigger ON deep_scan_insights;
CREATE TRIGGER insight_priority_trigger
  BEFORE INSERT OR UPDATE ON deep_scan_insights
  FOR EACH ROW
  EXECUTE FUNCTION calculate_insight_priority();
