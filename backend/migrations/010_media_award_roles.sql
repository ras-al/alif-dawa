-- Add new roles for Media and Award Point
INSERT INTO roles (name) VALUES ('media'), ('award_point');

-- Create a sequence for result sequence numbers
CREATE SEQUENCE IF NOT EXISTS fest_result_seq START 1;

-- Add result_sequence_number to fest_programs
ALTER TABLE fest_programs ADD COLUMN IF NOT EXISTS result_sequence_number INTEGER UNIQUE;

-- Add is_awarded to fest_results to track prize distribution
ALTER TABLE fest_results ADD COLUMN IF NOT EXISTS is_awarded BOOLEAN DEFAULT false;
