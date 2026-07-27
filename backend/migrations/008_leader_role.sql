-- ============================================================
-- 008: Add Leader Role & Team Leader Mapping
-- ============================================================

-- Add 'leader' to roles (idempotent)
INSERT INTO roles (name) VALUES ('leader') ON CONFLICT (name) DO NOTHING;

-- Table to link leader users to fest teams
CREATE TABLE IF NOT EXISTS fest_team_leaders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fest_team_id INTEGER NOT NULL REFERENCES fest_teams(id) ON DELETE CASCADE,
    is_first_leader BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fest_team_id)
);

CREATE INDEX IF NOT EXISTS idx_fest_team_leaders_user ON fest_team_leaders(user_id);
CREATE INDEX IF NOT EXISTS idx_fest_team_leaders_team ON fest_team_leaders(fest_team_id);
