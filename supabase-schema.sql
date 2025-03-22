-- Supabase Schema for MindToEye
-- This script creates the necessary tables for the MindToEye application

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Concepts Table
CREATE TABLE IF NOT EXISTS brand_concepts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand_inputs JSONB NOT NULL,
    brand_output JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_concepts_project_id ON brand_concepts(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_concepts_is_active ON brand_concepts(is_active);

-- Sample user to get started (comment out if not needed)
INSERT INTO users (username, email) 
VALUES ('demo', 'demo@example.com')
ON CONFLICT (username) DO NOTHING;

-- Grant necessary permissions if using Row Level Security (RLS)
-- You'll uncomment and modify these as needed when implementing auth
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE brand_concepts ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
-- Example user policy (uncomment when implementing auth):
-- CREATE POLICY user_crud_own_record ON users 
--     FOR ALL 
--     TO authenticated 
--     USING (auth.uid() = id);

-- Example project policy (uncomment when implementing auth):
-- CREATE POLICY project_crud_own_record ON projects
--     FOR ALL
--     TO authenticated
--     USING (auth.uid() = user_id);

-- Example brand_concept policy (uncomment when implementing auth):
-- CREATE POLICY concept_select_from_owned_project ON brand_concepts
--     FOR SELECT
--     TO authenticated
--     USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));