ALTER TABLE fest_program_judges DROP CONSTRAINT IF EXISTS fest_program_judges_judge_id_fkey CASCADE;
ALTER TABLE fest_program_judges DROP COLUMN IF EXISTS judge_id CASCADE;
ALTER TABLE fest_program_judges ADD COLUMN IF NOT EXISTS judge_name VARCHAR(255);
ALTER TABLE fest_program_judges DROP CONSTRAINT IF EXISTS fest_program_judges_fest_program_id_judge_name_key;
ALTER TABLE fest_program_judges ADD UNIQUE (fest_program_id, judge_name);

ALTER TABLE fest_marks DROP CONSTRAINT IF EXISTS fest_marks_judge_id_fkey CASCADE;
ALTER TABLE fest_marks DROP COLUMN IF EXISTS judge_id CASCADE;
ALTER TABLE fest_marks ADD COLUMN IF NOT EXISTS judge_name VARCHAR(255);
ALTER TABLE fest_marks DROP CONSTRAINT IF EXISTS fest_marks_fest_registration_id_judge_name_key;
ALTER TABLE fest_marks ADD UNIQUE (fest_registration_id, judge_name);
