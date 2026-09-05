-- ============================================================
-- Migration 014: Award Point System, Media Role, Sequence Number
-- ============================================================

-- 1. Award Redemptions Table (tracks book prizes / rewards given to students)
CREATE TABLE IF NOT EXISTS fest_award_redemptions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    redeemed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_award_redemptions_student ON fest_award_redemptions(student_id);

-- 2. Sequence number on fest_programs (per-event-type sequential number)
ALTER TABLE fest_programs ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- 3. New roles
INSERT INTO roles (name) VALUES ('media') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('award_point') ON CONFLICT (name) DO NOTHING;
