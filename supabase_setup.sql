-- Schema setup for MindToEye application

-- Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id INTEGER NOT NULL,
  CONSTRAINT fk_projects_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create Brand Concepts Table
CREATE TABLE IF NOT EXISTS public.brand_concepts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  brand_inputs JSONB NOT NULL,
  brand_output JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_brand_concepts_project_id FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- Setup Row Level Security (RLS) policies
-- This is a Supabase best practice for security

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_concepts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service-role access (our server side)
CREATE POLICY "Service role can do all on users" ON public.users 
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on projects" ON public.projects 
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role can do all on brand_concepts" ON public.brand_concepts 
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for anon access (for development purposes)
-- In production, these would be more restrictive
CREATE POLICY "Anon can read users" ON public.users 
  FOR SELECT USING (true);
  
CREATE POLICY "Anon can read/write projects" ON public.projects 
  FOR ALL USING (true);
  
CREATE POLICY "Anon can read/write brand_concepts" ON public.brand_concepts 
  FOR ALL USING (true);

-- Insert initial data
INSERT INTO public.users (username, password)
VALUES ('demo', 'password')
ON CONFLICT (username) DO NOTHING;

-- Create a sample project
INSERT INTO public.projects (name, client_name, user_id)
SELECT 'Solystra', 'Sample Client', id
FROM public.users
WHERE username = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM public.projects WHERE name = 'Solystra'
)
LIMIT 1;

-- Initial brand concept
WITH project_id AS (
  SELECT id FROM public.projects WHERE name = 'Solystra' LIMIT 1
)
INSERT INTO public.brand_concepts (project_id, name, is_active, brand_inputs, brand_output)
SELECT 
  id,
  'Initial Concept',
  true,
  '{"brandName":"Solystra","industry":"Renewable Energy","description":"A cutting-edge renewable energy company focused on solar solutions","values":[{"id":"1","value":"Sustainability"},{"id":"2","value":"Innovation"},{"id":"3","value":"Reliability"}],"designStyle":"modern","colorPreferences":["blue","orange","white"]}',
  '{"logo":{"primary":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><circle cx=\"100\" cy=\"100\" r=\"80\" fill=\"#1E40AF\"/><path d=\"M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z\" fill=\"#F97316\"/><circle cx=\"100\" cy=\"100\" r=\"30\" fill=\"#FFFFFF\"/></svg>","monochrome":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><circle cx=\"100\" cy=\"100\" r=\"80\" fill=\"#333333\"/><path d=\"M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z\" fill=\"#666666\"/><circle cx=\"100\" cy=\"100\" r=\"30\" fill=\"#FFFFFF\"/></svg>","reverse":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><circle cx=\"100\" cy=\"100\" r=\"80\" fill=\"#FFFFFF\"/><path d=\"M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z\" fill=\"#FFFFFF\"/><circle cx=\"100\" cy=\"100\" r=\"30\" fill=\"#1E40AF\"/></svg>"},"colors":[{"name":"Primary Blue","hex":"#1E40AF","type":"primary"},{"name":"Energy Orange","hex":"#F97316","type":"secondary"},{"name":"Pure White","hex":"#FFFFFF","type":"accent"},{"name":"Deep Navy","hex":"#0F172A","type":"base"}],"typography":{"headings":"Montserrat","body":"Open Sans"},"logoDescription":"A modern and bold logo representing solar energy and innovation","tagline":"Powering Tomorrow\'s World","contactName":"Alex Rivera","contactTitle":"Chief Innovation Officer","contactPhone":"+1 (415) 555-8729","address":"123 Solar Way, San Francisco, CA 94110","mockups":[]}'
FROM project_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.brand_concepts 
  WHERE name = 'Initial Concept' AND project_id = (SELECT id FROM project_id)
);