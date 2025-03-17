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
  user_id INTEGER NOT NULL
);

-- Create Brand Concepts Table
CREATE TABLE IF NOT EXISTS public.brand_concepts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  brand_inputs JSONB NOT NULL,
  brand_output JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE
);

-- Add foreign key constraints
ALTER TABLE public.projects 
  ADD CONSTRAINT fk_projects_user_id 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.brand_concepts 
  ADD CONSTRAINT fk_brand_concepts_project_id 
  FOREIGN KEY (project_id) 
  REFERENCES public.projects(id) 
  ON DELETE CASCADE;

-- Create an example user (password is 'password')
INSERT INTO public.users (username, password)
VALUES ('demo', 'password')
ON CONFLICT (username) DO NOTHING;

-- Create a sample project
INSERT INTO public.projects (name, client_name, user_id)
SELECT 'Solystra', 'Sample Client', id
FROM public.users
WHERE username = 'demo'
ON CONFLICT DO NOTHING;