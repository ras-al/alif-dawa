-- ============================================================
-- Migration: Class-based Login System
-- Each class gets its own login credentials (username/password)
-- Teachers are linked to classes via subjects they teach
-- ============================================================

-- 1. Add 'class' role
INSERT INTO roles (name) VALUES ('class') ON CONFLICT (name) DO NOTHING;

-- 2. Link classes to user accounts for login
ALTER TABLE classes ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL;

-- 3. Teacher-Subject-Class mapping: which teacher teaches which subject in which class
CREATE TABLE IF NOT EXISTS class_teacher_subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    UNIQUE(class_id, subject_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_cts_class_id ON class_teacher_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_cts_teacher_id ON class_teacher_subjects(teacher_id);
