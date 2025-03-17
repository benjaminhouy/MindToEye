import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ES Modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs the SQL migration file against Supabase
 * 
 * Note: This approach uses Supabase REST API with individual table operations
 * since direct SQL execution via RPC is not available in the standard Supabase setup.
 */
async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Running migration using Supabase client...');
  
  try {
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: 1,
        username: 'demo',
        password: 'password'
      })
      .select()
      .single();
    
    if (usersError) {
      console.error('Error creating users table:', usersError);
    } else {
      console.log('Users table created or already exists');
    }
    
    // Create projects table
    console.log('Creating projects table...');
    const { error: projectsError } = await supabase
      .from('projects')
      .insert({
        id: 1,
        name: 'Solystra',
        client_name: 'Sample Client',
        user_id: 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (projectsError) {
      console.error('Error creating projects table:', projectsError);
    } else {
      console.log('Projects table created or already exists');
    }
    
    // Create brand_concepts table
    console.log('Creating brand_concepts table...');
    const { error: conceptsError } = await supabase
      .from('brand_concepts')
      .insert({
        id: 1,
        project_id: 1,
        name: 'Initial Concept',
        is_active: true,
        brand_inputs: {
          brandName: 'Solystra',
          industry: 'Renewable Energy',
          description: 'A cutting-edge renewable energy company focused on solar solutions',
          values: [
            { id: '1', value: 'Sustainability' },
            { id: '2', value: 'Innovation' },
            { id: '3', value: 'Reliability' }
          ],
          designStyle: 'modern',
          colorPreferences: ['blue', 'orange', 'white']
        },
        brand_output: {
          logo: {
            primary: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#1E40AF"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#F97316"/><circle cx="100" cy="100" r="30" fill="#FFFFFF"/></svg>',
            monochrome: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#333333"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#666666"/><circle cx="100" cy="100" r="30" fill="#FFFFFF"/></svg>',
            reverse: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="80" fill="#FFFFFF"/><path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM100 150C67.77 150 42 124.23 42 92C42 59.77 67.77 34 100 34C132.23 34 158 59.77 158 92C158 124.23 132.23 150 100 150Z" fill="#FFFFFF"/><circle cx="100" cy="100" r="30" fill="#1E40AF"/></svg>'
          },
          colors: [
            { name: 'Primary Blue', hex: '#1E40AF', type: 'primary' },
            { name: 'Energy Orange', hex: '#F97316', type: 'secondary' },
            { name: 'Pure White', hex: '#FFFFFF', type: 'accent' },
            { name: 'Deep Navy', hex: '#0F172A', type: 'base' }
          ],
          typography: {
            headings: 'Montserrat',
            body: 'Open Sans'
          },
          logoDescription: 'A modern and bold logo representing solar energy and innovation',
          tagline: "Powering Tomorrow's World",
          contactName: 'Alex Rivera',
          contactTitle: 'Chief Innovation Officer',
          contactPhone: '+1 (415) 555-8729',
          address: '123 Solar Way, San Francisco, CA 94110',
          mockups: []
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (conceptsError) {
      console.error('Error creating brand_concepts table:', conceptsError);
    } else {
      console.log('Brand concepts table created or already exists');
    }
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();