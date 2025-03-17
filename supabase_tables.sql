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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create Brand Concepts Table
CREATE TABLE IF NOT EXISTS public.brand_concepts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  brand_inputs JSONB NOT NULL,
  brand_output JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Create an example user if it doesn't exist
INSERT INTO public.users (username, password)
VALUES ('demo', 'demo123')
ON CONFLICT (username) DO NOTHING;

-- Create sample projects for demo user
DO $$
DECLARE
  demo_user_id INTEGER;
BEGIN
  SELECT id INTO demo_user_id FROM users WHERE username = 'demo';
  
  -- Only insert sample projects if demo user exists and has no projects
  IF demo_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE user_id = demo_user_id) THEN
    -- Insert sample projects
    INSERT INTO projects (name, client_name, user_id)
    VALUES 
      ('Eco Threads Rebrand', 'Sustainable Fashion Co.', demo_user_id),
      ('TechVision App Launch', 'TechVision Inc.', demo_user_id),
      ('Fresh Bites Cafe', 'Healthy Foods LLC', demo_user_id);
  END IF;
END $$;

-- Create a sample brand concept if none exist
DO $$
DECLARE
  first_project_id INTEGER;
BEGIN
  SELECT id INTO first_project_id FROM projects LIMIT 1;
  
  IF first_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM brand_concepts WHERE project_id = first_project_id) THEN
    INSERT INTO brand_concepts (
      project_id, 
      name, 
      created_at, 
      brand_inputs, 
      brand_output, 
      is_active
    )
    VALUES (
      first_project_id,
      'Initial Concept',
      CURRENT_TIMESTAMP,
      '{"brandName":"Eco Threads","industry":"Sustainable Fashion","description":"An eco-friendly clothing brand focused on sustainable materials and ethical manufacturing","values":[{"id":"1","value":"Sustainability"},{"id":"2","value":"Quality"},{"id":"3","value":"Ethics"}],"designStyle":"modern","colorPreferences":["green","beige","brown"]}'::jsonb,
      '{"logo":{"primary":"<svg width=\"200\" height=\"80\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><path d=\"M40 40c0-8.837 7.163-16 16-16s16 7.163 16 16-7.163 16-16 16-16-7.163-16-16zm8 0c0 4.418 3.582 8 8 8s8-3.582 8-8-3.582-8-8-8-8 3.582-8 8z\" fill=\"#4CAF50\"/><path d=\"M85 25h5v30h-5zM95 25h15v5H95zM95 37.5h15v5H95zM95 50h15v5H95zM120 25h20v30h-20zm5 5h10v20h-10zM145 25h15v5h-15zM145 37.5h15v5h-15zM145 50h15v5h-15z\" fill=\"#8D6E63\"/></g></svg>","monochrome":"<svg width=\"200\" height=\"80\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><path d=\"M40 40c0-8.837 7.163-16 16-16s16 7.163 16 16-7.163 16-16 16-16-7.163-16-16zm8 0c0 4.418 3.582 8 8 8s8-3.582 8-8-3.582-8-8-8-8 3.582-8 8z\" fill=\"#333\"/><path d=\"M85 25h5v30h-5zM95 25h15v5H95zM95 37.5h15v5H95zM95 50h15v5H95zM120 25h20v30h-20zm5 5h10v20h-10zM145 25h15v5h-15zM145 37.5h15v5h-15zM145 50h15v5h-15z\" fill=\"#333\"/></g></svg>","reverse":"<svg width=\"200\" height=\"80\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><path d=\"M40 40c0-8.837 7.163-16 16-16s16 7.163 16 16-7.163 16-16 16-16-7.163-16-16zm8 0c0 4.418 3.582 8 8 8s8-3.582 8-8-3.582-8-8-8-8 3.582-8 8z\" fill=\"#FFF\"/><path d=\"M85 25h5v30h-5zM95 25h15v5H95zM95 37.5h15v5H95zM95 50h15v5H95zM120 25h20v30h-20zm5 5h10v20h-10zM145 25h15v5h-15zM145 37.5h15v5h-15zM145 50h15v5h-15z\" fill=\"#FFF\"/></g></svg>"},"colors":[{"name":"Forest Green","hex":"#4CAF50","type":"primary"},{"name":"Earth Brown","hex":"#8D6E63","type":"secondary"},{"name":"Natural Beige","hex":"#F5F5DC","type":"accent"},{"name":"Charcoal","hex":"#333333","type":"base"}],"typography":{"headings":"Montserrat","body":"Roboto"},"logoDescription":"A minimalist logo representing sustainable fashion with natural elements","tagline":"Wear the Change You Want to See","contactName":"Emma Green","contactTitle":"Sustainability Director","contactPhone":"+1 (415) 555-0127","address":"123 Eco Way, Portland, OR 97204","mockups":[]}'::jsonb,
      TRUE
    );
  END IF;
END $$;