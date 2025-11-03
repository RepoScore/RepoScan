/*
  # Fix confidence column data type

  The confidence column was set to numeric(3,2) which can only store values 0.00-9.99.
  This causes overflow errors when trying to store confidence scores like 70, 80, 85, etc.
  
  This migration changes the column to integer to match the safety_score and legitimacy_score columns.
*/

ALTER TABLE repo_scans 
ALTER COLUMN confidence TYPE integer USING confidence::integer;
