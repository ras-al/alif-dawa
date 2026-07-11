-- ============================================================
-- Add charge_teacher_id to classes
-- ============================================================

ALTER TABLE classes ADD COLUMN IF NOT EXISTS charge_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;
