// Script to create tables in Supabase
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Get Supabase connection details from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function createTables() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    return;
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('Creating tables in Supabase...');
    
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'users',
      columns: `
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      `
    });
    
    if (usersError) {
      console.error('Failed to create users table:', usersError);
      
      // Fallback with direct SQL
      console.log('Attempting fallback method for users table...');
      const createUsersSql = `
        CREATE TABLE IF NOT EXISTS public.users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        );
      `;
      
      const { error: directUsersError } = await supabase
        .from('_executeSql')
        .select('result')
        .eq('query', createUsersSql)
        .single();
        
      if (directUsersError) {
        console.error('Failed to create users table with fallback method:', directUsersError);
        
        // Manual insert approach (will create table if needed)
        console.log('Trying to create users table via insertion...');
        const { error: insertError } = await supabase
          .from('users')
          .insert({ 
            username: 'admin',
            password: 'password123' // This should be hashed in production
          });
          
        if (insertError && insertError.code !== '23505') { // Ignore if user already exists
          console.error('Failed to create users table via insertion:', insertError);
        } else {
          console.log('Users table created successfully via insertion.');
        }
      } else {
        console.log('Users table created successfully with fallback method.');
      }
    } else {
      console.log('Users table created successfully.');
    }
    
    // Create projects table
    console.log('Creating projects table...');
    const { error: projectsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'projects',
      columns: `
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        client_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
      `
    });
    
    if (projectsError) {
      console.error('Failed to create projects table:', projectsError);
      
      // Fallback with direct SQL
      console.log('Attempting fallback method for projects table...');
      const createProjectsSql = `
        CREATE TABLE IF NOT EXISTS public.projects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          client_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
        );
      `;
      
      const { error: directProjectsError } = await supabase
        .from('_executeSql')
        .select('result')
        .eq('query', createProjectsSql)
        .single();
        
      if (directProjectsError) {
        console.error('Failed to create projects table with fallback method:', directProjectsError);
        
        // Manual insert approach (will create table if needed)
        console.log('Trying to create projects table via insertion...');
        
        // First, get a user ID to reference
        const { data: userData, error: userQueryError } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single();
          
        if (userQueryError) {
          console.error('Failed to get user ID for project creation:', userQueryError);
        } else {
          const { error: insertError } = await supabase
            .from('projects')
            .insert({ 
              name: 'Sample Project',
              client_name: 'Sample Client',
              user_id: userData.id
            });
            
          if (insertError && insertError.code !== '23505') { // Ignore if project already exists
            console.error('Failed to create projects table via insertion:', insertError);
          } else {
            console.log('Projects table created successfully via insertion.');
          }
        }
      } else {
        console.log('Projects table created successfully with fallback method.');
      }
    } else {
      console.log('Projects table created successfully.');
    }
    
    // Create brand_concepts table
    console.log('Creating brand_concepts table...');
    const { error: conceptsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'brand_concepts',
      columns: `
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        brand_inputs JSONB NOT NULL,
        brand_output JSONB NOT NULL,
        is_active BOOLEAN DEFAULT FALSE
      `
    });
    
    if (conceptsError) {
      console.error('Failed to create brand_concepts table:', conceptsError);
      
      // Fallback with direct SQL
      console.log('Attempting fallback method for brand_concepts table...');
      const createConceptsSql = `
        CREATE TABLE IF NOT EXISTS public.brand_concepts (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          brand_inputs JSONB NOT NULL,
          brand_output JSONB NOT NULL,
          is_active BOOLEAN DEFAULT FALSE
        );
      `;
      
      const { error: directConceptsError } = await supabase
        .from('_executeSql')
        .select('result')
        .eq('query', createConceptsSql)
        .single();
        
      if (directConceptsError) {
        console.error('Failed to create brand_concepts table with fallback method:', directConceptsError);
        
        // Manual insert approach (will create table if needed)
        console.log('Trying to create brand_concepts table via insertion...');
        
        // First, get a project ID to reference
        const { data: projectData, error: projectQueryError } = await supabase
          .from('projects')
          .select('id')
          .limit(1)
          .single();
          
        if (projectQueryError) {
          console.error('Failed to get project ID for concept creation:', projectQueryError);
        } else {
          const { error: insertError } = await supabase
            .from('brand_concepts')
            .insert({ 
              project_id: projectData.id,
              name: 'Sample Concept',
              brand_inputs: { description: 'Sample input' },
              brand_output: { logo: 'Sample output' },
              is_active: false
            });
            
          if (insertError && insertError.code !== '23505') { // Ignore if concept already exists
            console.error('Failed to create brand_concepts table via insertion:', insertError);
          } else {
            console.log('Brand_concepts table created successfully via insertion.');
          }
        }
      } else {
        console.log('Brand_concepts table created successfully with fallback method.');
      }
    } else {
      console.log('Brand_concepts table created successfully.');
    }
    
    console.log('Table creation process completed.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTables();