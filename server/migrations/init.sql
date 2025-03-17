-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create brand_concepts table
CREATE TABLE IF NOT EXISTS brand_concepts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  brand_inputs JSONB NOT NULL,
  brand_output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_concepts_project_id ON brand_concepts(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_concepts_is_active ON brand_concepts(is_active);

-- Insert sample user (only for development environments)
INSERT INTO users (username, password)
VALUES ('demo', 'demo123')
ON CONFLICT (username) DO NOTHING;

-- Get the user ID for the demo user
DO $$
DECLARE
  demo_user_id INTEGER;
BEGIN
  SELECT id INTO demo_user_id FROM users WHERE username = 'demo';
  
  -- Insert sample projects
  INSERT INTO projects (name, client_name, user_id)
  VALUES ('Solystra', 'Sample Client', demo_user_id),
         ('NexGen Fintech', 'Financial Innovations Inc.', demo_user_id)
  ON CONFLICT DO NOTHING;
  
  -- Get project IDs
  DECLARE
    solystra_id INTEGER;
    nexgen_id INTEGER;
  BEGIN
    SELECT id INTO solystra_id FROM projects WHERE name = 'Solystra' AND user_id = demo_user_id;
    SELECT id INTO nexgen_id FROM projects WHERE name = 'NexGen Fintech' AND user_id = demo_user_id;
    
    -- Insert brand concepts for Solystra
    IF solystra_id IS NOT NULL THEN
      INSERT INTO brand_concepts (project_id, name, is_active, brand_inputs, brand_output)
      VALUES (
        solystra_id,
        'Initial Concept',
        true,
        '{
          "brandName": "Solystra",
          "industry": "Renewable Energy",
          "description": "A cutting-edge renewable energy company focused on solar solutions",
          "values": [
            {"id": "1", "value": "Sustainability"},
            {"id": "2", "value": "Innovation"},
            {"id": "3", "value": "Reliability"}
          ],
          "designStyle": "modern",
          "colorPreferences": ["blue", "orange", "white"]
        }'::jsonb,
        '{
          "logo": {
            "primary": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><circle cx=\"100\" cy=\"100\" r=\"80\" fill=\"#1E40AF\"/><path d=\"M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z\" fill=\"#F97316\"/><circle cx=\"100\" cy=\"100\" r=\"30\" fill=\"#FFFFFF\"/></svg>",
            "monochrome": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><circle cx=\"100\" cy=\"100\" r=\"80\" fill=\"#333333\"/><path d=\"M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z\" fill=\"#666666\"/><circle cx=\"100\" cy=\"100\" r=\"30\" fill=\"#FFFFFF\"/></svg>",
            "reverse": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><circle cx=\"100\" cy=\"100\" r=\"80\" fill=\"#FFFFFF\"/><path d=\"M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z\" fill=\"#FFFFFF\"/><circle cx=\"100\" cy=\"100\" r=\"30\" fill=\"#1E40AF\"/></svg>"
          },
          "colors": [
            {"name": "Primary Blue", "hex": "#1E40AF", "type": "primary"},
            {"name": "Energy Orange", "hex": "#F97316", "type": "secondary"},
            {"name": "Pure White", "hex": "#FFFFFF", "type": "accent"},
            {"name": "Deep Navy", "hex": "#0F172A", "type": "base"}
          ],
          "typography": {
            "headings": "Montserrat",
            "body": "Open Sans"
          },
          "logoDescription": "A modern and bold logo representing solar energy and innovation",
          "tagline": "Powering Tomorrow\'s World",
          "contactName": "Alex Rivera",
          "contactTitle": "Chief Innovation Officer",
          "contactPhone": "+1 (415) 555-8729",
          "address": "123 Solar Way, San Francisco, CA 94110",
          "mockups": []
        }'::jsonb
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Insert brand concept for NexGen Fintech
    IF nexgen_id IS NOT NULL THEN
      INSERT INTO brand_concepts (project_id, name, is_active, brand_inputs, brand_output)
      VALUES (
        nexgen_id,
        'Financial Tech Concept',
        true,
        '{
          "brandName": "NexGen Fintech",
          "industry": "Financial Technology",
          "description": "A revolutionary fintech platform that simplifies banking and investments",
          "values": [
            {"id": "1", "value": "Security"},
            {"id": "2", "value": "Innovation"},
            {"id": "3", "value": "Accessibility"},
            {"id": "4", "value": "Transparency"}
          ],
          "designStyle": "minimalist",
          "colorPreferences": ["navy", "gold", "teal"]
        }'::jsonb,
        '{
          "logo": {
            "primary": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><rect x=\"40\" y=\"40\" width=\"120\" height=\"120\" fill=\"#0A2342\" rx=\"10\" ry=\"10\"/><path d=\"M75 80L100 60L125 80L125 120L75 120L75 80Z\" fill=\"#E8C547\"/><path d=\"M85 100L115 100\" stroke=\"#20A39E\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M85 110L105 110\" stroke=\"#20A39E\" stroke-width=\"6\" stroke-linecap=\"round\"/></svg>",
            "monochrome": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><filter id=\"grayscale\"><feColorMatrix type=\"matrix\" values=\"0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0\"/></filter><rect x=\"40\" y=\"40\" width=\"120\" height=\"120\" fill=\"#333333\" rx=\"10\" ry=\"10\"/><path d=\"M75 80L100 60L125 80L125 120L75 120L75 80Z\" fill=\"#666666\"/><path d=\"M85 100L115 100\" stroke=\"#999999\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M85 110L105 110\" stroke=\"#999999\" stroke-width=\"6\" stroke-linecap=\"round\"/></svg>",
            "reverse": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" width=\"200\" height=\"200\"><rect width=\"200\" height=\"200\" fill=\"#111111\"/><rect x=\"40\" y=\"40\" width=\"120\" height=\"120\" fill=\"#FFFFFF\" rx=\"10\" ry=\"10\"/><path d=\"M75 80L100 60L125 80L125 120L75 120L75 80Z\" fill=\"#111111\"/><path d=\"M85 100L115 100\" stroke=\"#444444\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M85 110L105 110\" stroke=\"#444444\" stroke-width=\"6\" stroke-linecap=\"round\"/></svg>"
          },
          "colors": [
            {"name": "Navy Blue", "hex": "#0A2342", "type": "primary"},
            {"name": "Gold", "hex": "#E8C547", "type": "secondary"},
            {"name": "Teal", "hex": "#20A39E", "type": "accent"},
            {"name": "Charcoal", "hex": "#222222", "type": "base"}
          ],
          "typography": {
            "headings": "Poppins",
            "body": "Roboto"
          },
          "logoDescription": "A minimalist logo representing security and financial growth",
          "tagline": "Banking for the Digital Age",
          "contactName": "Jordan Chen",
          "contactTitle": "Director of Client Relations",
          "contactPhone": "+1 (415) 555-2390",
          "address": "485 Financial District Ave, San Francisco, CA 94104",
          "mockups": []
        }'::jsonb
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END;
END
$$;