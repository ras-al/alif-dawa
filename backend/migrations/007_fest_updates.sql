-- Update fest_programs schema
ALTER TABLE fest_programs ADD COLUMN is_group BOOLEAN DEFAULT FALSE;
ALTER TABLE fest_programs ADD COLUMN participant_count INTEGER DEFAULT 1;

-- Clear previous incorrectly seeded teams, programs, and related data
-- Due to ON DELETE CASCADE, deleting programs and teams will clear dependent registrations/marks/results
DELETE FROM fest_programs;
DELETE FROM fest_teams;
