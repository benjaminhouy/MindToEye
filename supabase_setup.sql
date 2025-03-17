-- Supabase setup script for MindToEye
-- This script creates all required tables in Supabase

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  user_id INTEGER NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Brand concepts table
CREATE TABLE IF NOT EXISTS brand_concepts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  brand_inputs JSONB NOT NULL,
  brand_output JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Insert demo data
INSERT INTO users (username, password)
VALUES ('demo', 'demo123')
ON CONFLICT (username) DO NOTHING;

-- Sample projects for demo user
-- Get the demo user ID
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
      
    -- Sample brand concept for Eco Threads
    INSERT INTO brand_concepts (project_id, name, brand_inputs, brand_output, is_active)
    VALUES (
      (SELECT id FROM projects WHERE name = 'Eco Threads Rebrand' AND user_id = demo_user_id),
      'Modern Sustainable',
      '{
        "industry": "Sustainable Fashion",
        "target_audience": "Environmentally conscious young adults, 18-35",
        "brand_values": "Sustainability, transparency, quality, innovation",
        "brand_personality": "Eco-friendly, modern, minimalist, transparent",
        "competitor_analysis": "Most competitors use earthy tones and leaf imagery, we want to stand out with a more modern approach",
        "brand_message": "Stylish clothing that doesn''t cost the earth"
      }'::jsonb,
      '{
        "brand_story": "Eco Threads began with a simple question: Why can''t sustainable fashion be stylish, affordable, and transparent? Our founder, after years in the traditional fashion industry, set out to create a brand that would challenge the status quo. Today, we craft modern essentials using only sustainable materials and ethical manufacturing practices. Every garment comes with a complete history of its journey from raw material to your closet.",
        "brand_voice": "Confident yet approachable, informative without being preachy, and always authentic.",
        "typography": {
          "headings": "Montserrat",
          "body": "Open Sans"
        },
        "colors": [
          {"hex": "#2D9D8A", "name": "Forest Teal", "type": "primary"},
          {"hex": "#F9F9F9", "name": "Clean White", "type": "base"},
          {"hex": "#303030", "name": "Carbon", "type": "base"},
          {"hex": "#F5F0E8", "name": "Natural", "type": "secondary"},
          {"hex": "#D3E8E1", "name": "Soft Sage", "type": "secondary"}
        ],
        "logo": {
          "concept": "A minimalist wordmark with a subtle leaf element integrated into the ''E''",
          "symbol_description": "Clean, minimalist wordmark with custom typography",
          "primary_svg": "<svg width=\"200\" height=\"80\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><path d=\"M26.5 44.45c0-4.5 2.8-7.4 7.3-7.4 3.35 0 5.55 1.75 6.35 4.45l-3.25 1c-.5-1.5-1.6-2.45-3.1-2.45-2.25 0-3.75 1.75-3.75 4.4 0 2.7 1.5 4.45 3.8 4.45 1.5 0 2.7-.9 3.15-2.45l3.25 1c-.8 2.7-3.1 4.5-6.45 4.5-4.5 0-7.3-2.9-7.3-7.5zM41.8 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM68.25 37.25h3.55v14.5h-3.35v-2.35c-.85 1.7-2.45 2.55-4.45 2.55-3.6 0-5.9-2.9-5.9-7.4 0-4.45 2.3-7.5 5.9-7.5 1.9 0 3.5.8 4.25 2.35v-2.15zm-6.65 7.3c0 2.7 1.4 4.4 3.45 4.4 2 0 3.45-1.8 3.45-4.4 0-2.65-1.45-4.5-3.45-4.5-2.05 0-3.45 1.85-3.45 4.5zM74.15 38.35c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm.25 3.2h3.5v10.2h-3.5v-10.2zM81.75 41.55h3.5v1.7c.7-1.15 1.9-1.9 3.8-1.9v3.3h-.85c-2.15 0-2.95.9-2.95 3.1v4h-3.5v-10.2zM90.8 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM111.15 41.55h3.5v10.2h-3.5v-1.6c-.7 1.2-2.05 1.8-3.75 1.8-3.1 0-5.1-2-5.1-5.65v-4.75h3.5v4.45c0 2 .9 3 2.55 3 1.8 0 2.8-1.05 2.8-3.2v-4.25zM121.1 54.05c-2.05 0-3.65-.55-4.95-1.7l1.6-2.3c.85.8 1.9 1.3 3.3 1.3 2.45 0 3.5-1.25 3.5-3.75v-.55c-.85 1.3-2.3 2-4.15 2-3.3 0-5.65-2.35-5.65-6.05 0-3.75 2.4-6.1 5.65-6.1 1.9 0 3.35.75 4.3 2.1v-1.9h3.35v10.4c0 4.4-2.5 6.55-6.95 6.55zm.1-7.7c1.9 0 3.5-1.3 3.5-3.4 0-2.15-1.6-3.4-3.5-3.4-1.9 0-3.45 1.25-3.45 3.4 0 2.1 1.55 3.4 3.45 3.4zM144.05 47.1h-9.25c.4 1.85 1.7 2.85 3.5 2.85 1.25 0 2.35-.4 3-1.2l2.25 1.95c-1.2 1.5-3.05 2.25-5.3 2.25-4.4 0-7.1-2.85-7.1-7.4 0-4.5 2.65-7.5 6.8-7.5 4 0 6.4 2.85 6.4 7.35 0 .55-.1 1.2-.3 1.7zm-9.1-2.7h5.75c-.05-2.1-1.25-3.35-2.85-3.35-1.55 0-2.7 1.3-2.9 3.35zM146.4 41.55h3.5v1.7c.7-1.15 1.9-1.9 3.8-1.9v3.3h-.85c-2.15 0-2.95.9-2.95 3.1v4h-3.5v-10.2zM154.65 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM172.4 37.25v14.5h-3.5v-14.5h3.5z\" fill=\"#2D9D8A\"/><path d=\"M122.5 31c4.5 0 8.15-3.65 8.15-8.15 0-4.5-3.65-8.15-8.15-8.15-4.5 0-8.15 3.65-8.15 8.15\" stroke=\"#2D9D8A\" stroke-width=\"2\"/></g></svg>",
          "mono_svg": "<svg width=\"200\" height=\"80\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><path d=\"M26.5 44.45c0-4.5 2.8-7.4 7.3-7.4 3.35 0 5.55 1.75 6.35 4.45l-3.25 1c-.5-1.5-1.6-2.45-3.1-2.45-2.25 0-3.75 1.75-3.75 4.4 0 2.7 1.5 4.45 3.8 4.45 1.5 0 2.7-.9 3.15-2.45l3.25 1c-.8 2.7-3.1 4.5-6.45 4.5-4.5 0-7.3-2.9-7.3-7.5zM41.8 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM68.25 37.25h3.55v14.5h-3.35v-2.35c-.85 1.7-2.45 2.55-4.45 2.55-3.6 0-5.9-2.9-5.9-7.4 0-4.45 2.3-7.5 5.9-7.5 1.9 0 3.5.8 4.25 2.35v-2.15zm-6.65 7.3c0 2.7 1.4 4.4 3.45 4.4 2 0 3.45-1.8 3.45-4.4 0-2.65-1.45-4.5-3.45-4.5-2.05 0-3.45 1.85-3.45 4.5zM74.15 38.35c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm.25 3.2h3.5v10.2h-3.5v-10.2zM81.75 41.55h3.5v1.7c.7-1.15 1.9-1.9 3.8-1.9v3.3h-.85c-2.15 0-2.95.9-2.95 3.1v4h-3.5v-10.2zM90.8 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM111.15 41.55h3.5v10.2h-3.5v-1.6c-.7 1.2-2.05 1.8-3.75 1.8-3.1 0-5.1-2-5.1-5.65v-4.75h3.5v4.45c0 2 .9 3 2.55 3 1.8 0 2.8-1.05 2.8-3.2v-4.25zM121.1 54.05c-2.05 0-3.65-.55-4.95-1.7l1.6-2.3c.85.8 1.9 1.3 3.3 1.3 2.45 0 3.5-1.25 3.5-3.75v-.55c-.85 1.3-2.3 2-4.15 2-3.3 0-5.65-2.35-5.65-6.05 0-3.75 2.4-6.1 5.65-6.1 1.9 0 3.35.75 4.3 2.1v-1.9h3.35v10.4c0 4.4-2.5 6.55-6.95 6.55zm.1-7.7c1.9 0 3.5-1.3 3.5-3.4 0-2.15-1.6-3.4-3.5-3.4-1.9 0-3.45 1.25-3.45 3.4 0 2.1 1.55 3.4 3.45 3.4zM144.05 47.1h-9.25c.4 1.85 1.7 2.85 3.5 2.85 1.25 0 2.35-.4 3-1.2l2.25 1.95c-1.2 1.5-3.05 2.25-5.3 2.25-4.4 0-7.1-2.85-7.1-7.4 0-4.5 2.65-7.5 6.8-7.5 4 0 6.4 2.85 6.4 7.35 0 .55-.1 1.2-.3 1.7zm-9.1-2.7h5.75c-.05-2.1-1.25-3.35-2.85-3.35-1.55 0-2.7 1.3-2.9 3.35zM146.4 41.55h3.5v1.7c.7-1.15 1.9-1.9 3.8-1.9v3.3h-.85c-2.15 0-2.95.9-2.95 3.1v4h-3.5v-10.2zM154.65 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM172.4 37.25v14.5h-3.5v-14.5h3.5z\" fill=\"#000\"/><path d=\"M122.5 31c4.5 0 8.15-3.65 8.15-8.15 0-4.5-3.65-8.15-8.15-8.15-4.5 0-8.15 3.65-8.15 8.15\" stroke=\"#000\" stroke-width=\"2\"/></g></svg>",
          "reverse_svg": "<svg width=\"200\" height=\"80\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" fill-rule=\"evenodd\"><path d=\"M26.5 44.45c0-4.5 2.8-7.4 7.3-7.4 3.35 0 5.55 1.75 6.35 4.45l-3.25 1c-.5-1.5-1.6-2.45-3.1-2.45-2.25 0-3.75 1.75-3.75 4.4 0 2.7 1.5 4.45 3.8 4.45 1.5 0 2.7-.9 3.15-2.45l3.25 1c-.8 2.7-3.1 4.5-6.45 4.5-4.5 0-7.3-2.9-7.3-7.5zM41.8 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM68.25 37.25h3.55v14.5h-3.35v-2.35c-.85 1.7-2.45 2.55-4.45 2.55-3.6 0-5.9-2.9-5.9-7.4 0-4.45 2.3-7.5 5.9-7.5 1.9 0 3.5.8 4.25 2.35v-2.15zm-6.65 7.3c0 2.7 1.4 4.4 3.45 4.4 2 0 3.45-1.8 3.45-4.4 0-2.65-1.45-4.5-3.45-4.5-2.05 0-3.45 1.85-3.45 4.5zM74.15 38.35c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm.25 3.2h3.5v10.2h-3.5v-10.2zM81.75 41.55h3.5v1.7c.7-1.15 1.9-1.9 3.8-1.9v3.3h-.85c-2.15 0-2.95.9-2.95 3.1v4h-3.5v-10.2zM90.8 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM111.15 41.55h3.5v10.2h-3.5v-1.6c-.7 1.2-2.05 1.8-3.75 1.8-3.1 0-5.1-2-5.1-5.65v-4.75h3.5v4.45c0 2 .9 3 2.55 3 1.8 0 2.8-1.05 2.8-3.2v-4.25zM121.1 54.05c-2.05 0-3.65-.55-4.95-1.7l1.6-2.3c.85.8 1.9 1.3 3.3 1.3 2.45 0 3.5-1.25 3.5-3.75v-.55c-.85 1.3-2.3 2-4.15 2-3.3 0-5.65-2.35-5.65-6.05 0-3.75 2.4-6.1 5.65-6.1 1.9 0 3.35.75 4.3 2.1v-1.9h3.35v10.4c0 4.4-2.5 6.55-6.95 6.55zm.1-7.7c1.9 0 3.5-1.3 3.5-3.4 0-2.15-1.6-3.4-3.5-3.4-1.9 0-3.45 1.25-3.45 3.4 0 2.1 1.55 3.4 3.45 3.4zM144.05 47.1h-9.25c.4 1.85 1.7 2.85 3.5 2.85 1.25 0 2.35-.4 3-1.2l2.25 1.95c-1.2 1.5-3.05 2.25-5.3 2.25-4.4 0-7.1-2.85-7.1-7.4 0-4.5 2.65-7.5 6.8-7.5 4 0 6.4 2.85 6.4 7.35 0 .55-.1 1.2-.3 1.7zm-9.1-2.7h5.75c-.05-2.1-1.25-3.35-2.85-3.35-1.55 0-2.7 1.3-2.9 3.35zM146.4 41.55h3.5v1.7c.7-1.15 1.9-1.9 3.8-1.9v3.3h-.85c-2.15 0-2.95.9-2.95 3.1v4h-3.5v-10.2zM154.65 44.55c0-4.45 2.8-7.5 6.95-7.5 4.15 0 6.95 3.05 6.95 7.5s-2.8 7.4-6.95 7.4c-4.15 0-6.95-2.95-6.95-7.4zm10.4 0c0-2.65-1.45-4.5-3.45-4.5s-3.45 1.85-3.45 4.5c0 2.6 1.45 4.4 3.45 4.4s3.45-1.8 3.45-4.4zM172.4 37.25v14.5h-3.5v-14.5h3.5z\" fill=\"#fff\"/><path d=\"M122.5 31c4.5 0 8.15-3.65 8.15-8.15 0-4.5-3.65-8.15-8.15-8.15-4.5 0-8.15 3.65-8.15 8.15\" stroke=\"#fff\" stroke-width=\"2\"/></g></svg>"
        },
        "key_messaging": [
          "Sustainable fashion, redesigned.",
          "Style that doesn''t cost the earth.",
          "Transparent. Ethical. Stylish."
        ]
      }'::jsonb,
      TRUE
    );
  END IF;
END $$;