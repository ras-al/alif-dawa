CREATE TABLE parent_feedback (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(150) NOT NULL,
    parent_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    class_name VARCHAR(50),
    feedback TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parent_feedback_student ON parent_feedback(student_name);
CREATE INDEX idx_parent_feedback_parent ON parent_feedback(parent_name);
CREATE INDEX idx_parent_feedback_phone ON parent_feedback(phone_number);
CREATE INDEX idx_parent_feedback_class ON parent_feedback(class_name);
