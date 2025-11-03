/*
  # Fix confidence column constraint

  The confidence check constraint was checking for values 0-1 (like 0.85)
  but the application sends values 0-100 (like 85).
  
  This migration drops the old constraint and adds a new one for 0-100 range.
*/

ALTER TABLE repo_scans 
DROP CONSTRAINT IF EXISTS repo_scans_confidence_check;

ALTER TABLE repo_scans 
ADD CONSTRAINT repo_scans_confidence_check 
CHECK (confidence >= 0 AND confidence <= 100);
