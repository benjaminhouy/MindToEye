-- Create tables script for Supabase
-- Execute this through the Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create brand_concepts table
CREATE TABLE IF NOT EXISTS public.brand_concepts (
  id SERIAL PRIMARY KEY, 
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brand_inputs JSONB NOT NULL,
  brand_output JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE
);

-- Create demo user (if not exists)
INSERT INTO public.users (username, password)
VALUES ('demo', 'password123')
ON CONFLICT (username) DO NOTHING;

-- Create sample project for demo user
WITH demo_user AS (
  SELECT id FROM public.users WHERE username = 'demo' LIMIT 1
)
INSERT INTO public.projects (name, client_name, user_id)
SELECT 'Sample Brand', 'Sample Client', id FROM demo_user
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects 
  WHERE name = 'Sample Brand' AND user_id = (SELECT id FROM demo_user)
);

-- Confirm tables were created
SELECT 'Users table count: ' || COUNT(*)::text FROM public.users;
SELECT 'Projects table count: ' || COUNT(*)::text FROM public.projects;
SELECT 'Brand concepts table count: ' || COUNT(*)::text FROM public.brand_concepts;