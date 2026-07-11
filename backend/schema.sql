-- ============================================================
-- Alif Dawa College Peravoor - Institution Management System
-- Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ROLES & USERS
-- ============================================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name) VALUES ('admin'), ('teacher'), ('student'), ('class');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================================
-- ACADEMIC STRUCTURE
-- ============================================================

CREATE TABLE academic_years (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    charge_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE class_subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    UNIQUE(class_id, subject_id)
);

CREATE INDEX idx_class_subjects_class_id ON class_subjects(class_id);

-- ============================================================
-- TEACHERS
-- ============================================================

CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teacher_classes (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, class_id, academic_year_id)
);

CREATE INDEX idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX idx_teacher_classes_class_id ON teacher_classes(class_id);

-- Teacher-Subject-Class mapping: which teacher teaches which subject in which class
CREATE TABLE class_teacher_subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    UNIQUE(class_id, subject_id, academic_year_id)
);

CREATE INDEX idx_cts_class_id ON class_teacher_subjects(class_id);
CREATE INDEX idx_cts_teacher_id ON class_teacher_subjects(teacher_id);

-- ============================================================
-- STUDENTS
-- ============================================================

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150),
    class_id INTEGER REFERENCES classes(id),
    phone VARCHAR(20),
    address TEXT,
    date_of_admission DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_admission_number ON students(admission_number);
CREATE INDEX idx_students_name ON students(name);

-- ============================================================
-- ACADEMIC MONTHS & MARKS
-- ============================================================

CREATE TABLE academic_months (
    id SERIAL PRIMARY KEY,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    month_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'locked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(academic_year_id, month_number)
);

CREATE INDEX idx_academic_months_year ON academic_months(academic_year_id);

CREATE TABLE exam_marks (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_month_id INTEGER NOT NULL REFERENCES academic_months(id) ON DELETE CASCADE,
    marks DECIMAL(5,2),
    remarks TEXT,
    entered_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, academic_month_id)
);

CREATE INDEX idx_exam_marks_student ON exam_marks(student_id);
CREATE INDEX idx_exam_marks_month ON exam_marks(academic_month_id);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
    marked_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- ============================================================
-- LEAVE MANAGEMENT
-- ============================================================

CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER REFERENCES users(id),
    review_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_requests_student ON leave_requests(student_id);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_role VARCHAR(50), -- NULL = all, 'teacher', 'student'
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type VARCHAR(50),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- INSTITUTION SETTINGS
-- ============================================================

CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (key, value) VALUES
    ('institution_name', 'Alif Dawa College Peravoor'),
    ('institution_address', ''),
    ('institution_phone', ''),
    ('institution_email', ''),
    ('max_marks', '100');

-- ============================================================
-- DEFAULT ACADEMIC DATA
-- ============================================================

-- Default classes
INSERT INTO classes (name, display_order) VALUES
    ('H1', 1), ('H2', 2), ('H3', 3), ('H31', 4),
    ('P1', 5), ('P2', 6), ('B1', 7);

-- Default subjects
INSERT INTO subjects (name) VALUES
    ('Nahv'), ('Swarf'), ('Fiqh'), ('Silsila'),
    ('Alfiya'), ('Fathul Mueen'), ('Mishkath'), ('Balagha'), ('Iqra');

-- H1 subjects
INSERT INTO class_subjects (class_id, subject_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER ()
FROM classes c, subjects s
WHERE c.name = 'H1' AND s.name IN ('Nahv', 'Swarf', 'Fiqh');

-- H2 subjects
INSERT INTO class_subjects (class_id, subject_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER ()
FROM classes c, subjects s
WHERE c.name = 'H2' AND s.name IN ('Fiqh', 'Nahv', 'Swarf', 'Silsila');

-- H3 subjects
INSERT INTO class_subjects (class_id, subject_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER ()
FROM classes c, subjects s
WHERE c.name = 'H3' AND s.name IN ('Fiqh', 'Nahv', 'Silsila');

-- H31 subjects
INSERT INTO class_subjects (class_id, subject_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER ()
FROM classes c, subjects s
WHERE c.name = 'H31' AND s.name IN ('Fiqh', 'Nahv', 'Silsila');

-- P1 subjects
INSERT INTO class_subjects (class_id, subject_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER ()
FROM classes c, subjects s
WHERE c.name = 'P1' AND s.name IN ('Alfiya', 'Fathul Mueen', 'Mishkath', 'Balagha');

-- P2 subjects
INSERT INTO class_subjects (class_id, subject_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER ()
FROM classes c, subjects s
WHERE c.name = 'P2' AND s.name IN ('Fiqh', 'Nahv', 'Iqra');

-- B1 subjects
INSERT INTO class_subjects (class_id, subject_id, display_order)
SELECT c.id, s.id, ROW_NUMBER() OVER ()
FROM classes c, subjects s
WHERE c.name = 'B1' AND s.name IN ('Alfiya', 'Fathul Mueen', 'Mishkath', 'Balagha');
