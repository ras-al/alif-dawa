-- Insert new roles for the Fest Module
INSERT INTO roles (name) VALUES ('stage_admin'), ('judge'), ('green_room'), ('announcer');

-- Fest Teams / Groups
CREATE TABLE fest_teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    chest_number_start INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO fest_teams (name, chest_number_start) VALUES
    ('Premier', 100),
    ('Junior', 200),
    ('Senior', 300);

-- Fest Programs
CREATE TABLE fest_programs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Premier, Junior, Senior, General
    type VARCHAR(50) NOT NULL, -- stage, off-stage
    max_judges INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, live, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mapping for which judges can evaluate which programs
CREATE TABLE fest_program_judges (
    id SERIAL PRIMARY KEY,
    fest_program_id INTEGER NOT NULL REFERENCES fest_programs(id) ON DELETE CASCADE,
    judge_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(fest_program_id, judge_id)
);

-- Fest Participants (Students mapped to teams with a generated chest number)
CREATE TABLE fest_participants (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fest_team_id INTEGER NOT NULL REFERENCES fest_teams(id),
    chest_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id)
);

-- Fest Registrations (Participants enrolled in specific programs, with an assigned code letter)
CREATE TABLE fest_registrations (
    id SERIAL PRIMARY KEY,
    fest_participant_id INTEGER NOT NULL REFERENCES fest_participants(id) ON DELETE CASCADE,
    fest_program_id INTEGER NOT NULL REFERENCES fest_programs(id) ON DELETE CASCADE,
    code_letter VARCHAR(10),
    UNIQUE(fest_participant_id, fest_program_id)
);

-- Fest Marks (Judges scoring registrations)
CREATE TABLE fest_marks (
    id SERIAL PRIMARY KEY,
    fest_registration_id INTEGER NOT NULL REFERENCES fest_registrations(id) ON DELETE CASCADE,
    judge_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mark DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fest_registration_id, judge_id)
);

-- Fest Results (Finalized positions after Green Room verification)
CREATE TABLE fest_results (
    id SERIAL PRIMARY KEY,
    fest_program_id INTEGER NOT NULL REFERENCES fest_programs(id) ON DELETE CASCADE,
    fest_registration_id INTEGER NOT NULL REFERENCES fest_registrations(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, -- 1, 2, 3
    points INTEGER DEFAULT 0,
    published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fest_program_id, fest_registration_id)
);
