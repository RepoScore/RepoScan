/*
  # Update Repository Scans Schema for Dual-Score Engine

  1. Schema Changes
    - Add `overall_score` (integer) - Weighted blend of safety + legitimacy
    - Add `confidence` (numeric) - How confident we are in the scores (0-1)
    - Add `breakdown` (jsonb) - Per-category scores and signal details
    - Add `notes` (jsonb) - Array of short bullet notes from analysis
    - Rename existing columns for clarity

  2. New Structure
    The breakdown field will contain:
    {
      "safety": {
        "total": 0-100,
        "dependency_risks": 0-100,
        "code_security": 0-100,
        "config_hygiene": 0-100,
        "code_quality": 0-100,
        "maintenance_posture": 0-100
      },
      "legitimacy": {
        "total": 0-100,
        "working_evidence": 0-100,
        "transparency_docs": 0-100,
        "community_signals": 0-100,
        "author_reputation": 0-100,
        "license_compliance": 0-100
      }
    }
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repo_scans' AND column_name = 'overall_score'
  ) THEN
    ALTER TABLE repo_scans ADD COLUMN overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repo_scans' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE repo_scans ADD COLUMN confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repo_scans' AND column_name = 'breakdown'
  ) THEN
    ALTER TABLE repo_scans ADD COLUMN breakdown jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repo_scans' AND column_name = 'notes'
  ) THEN
    ALTER TABLE repo_scans ADD COLUMN notes jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;