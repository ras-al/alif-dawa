CREATE TABLE IF NOT EXISTS fest_participant_card_templates (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
