/*
  # Add Code Quality Metrics to Repository Scans

  1. Schema Changes
    - Add `code_quality_metrics` JSONB column to `repo_scans` table
      - Will store code quality analysis results:
        - total_files_analyzed: number of files scanned
        - avg_file_size: average file size in bytes
        - avg_complexity: average cyclomatic complexity
        - code_duplication_risk: percentage risk score
        - comment_ratio: ratio of comments to code
        - large_files_count: count of files over 50KB
        - quality_score: overall quality score (0-100)
        - issues: array of quality issues found

  2. Notes
    - Uses JSONB for flexible metrics storage
    - Allows for detailed code quality tracking
    - Supports quality trend analysis over time
*/

-- Add code quality metrics column to repo_scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repo_scans' AND column_name = 'code_quality_metrics'
  ) THEN
    ALTER TABLE repo_scans ADD COLUMN code_quality_metrics JSONB DEFAULT '{
      "total_files_analyzed": 0,
      "avg_file_size": 0,
      "avg_complexity": 0,
      "code_duplication_risk": 0,
      "comment_ratio": 0,
      "large_files_count": 0,
      "quality_score": 0,
      "issues": []
    }'::jsonb;
  END IF;
END $$;
