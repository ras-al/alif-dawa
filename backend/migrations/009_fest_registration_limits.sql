-- Add constraints for fest participant registration
ALTER TABLE fest_programs ADD COLUMN team_limit INTEGER;
ALTER TABLE fest_programs ADD COLUMN is_group BOOLEAN DEFAULT false;

-- Add category to fest_participants to enforce category restrictions
ALTER TABLE fest_participants ADD COLUMN category VARCHAR(50);
