-- Add attendance tracking for stage admin workflow
ALTER TABLE fest_registrations ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT false;

-- Add judging phase status to programs
-- The status flow: scheduled -> live -> judging -> completed
ALTER TABLE fest_programs DROP CONSTRAINT IF EXISTS fest_programs_status_check;
ALTER TABLE fest_programs ADD CONSTRAINT fest_programs_status_check 
  CHECK (status IN ('scheduled', 'live', 'judging', 'completed'));
