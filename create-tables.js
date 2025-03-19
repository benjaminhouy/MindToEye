// Script to create tables in Supabase using the REST API approach
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createTables() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('Error: SUPABASE_URL and/or SUPABASE_ANON_KEY environment variables are not set');
    process.exit(1);
  }

  console.log('Supabase credentials are defined. Creating client...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    console.log('Connected to Supabase. Attempting to create tables...');
    
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        );
      `
    });
    
    if (usersError) {
      console.error('Error creating users table:', usersError);
      
      // Try alternative approach with REST API
      console.log('Trying alternative approach for users table...');
      const { error: createError } = await supabase
        .from('users')
        .insert({})
        .select();
        
      if (createError && createError.message.includes('does not exist')) {
        console.log('Users table does not exist. Creating via direct API...');
        // Create table using REST API - this is limited but can work for simple structures
        await supabase.schema.createTable('users', {
          id: 'serial',
          username: 'text',
          password: 'text'
        });
        console.log('Users table created using schema API');
      }
    } else {
      console.log('Users table created successfully');
    }
    
    // Create projects table
    console.log('Creating projects table...');
    const { error: projectsError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.projects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          client_name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          user_id INTEGER NOT NULL,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `
    });
    
    if (projectsError) {
      console.error('Error creating projects table:', projectsError);
      // Try alternative approach
      console.log('Trying alternative approach for projects table...');
      await supabase.schema.createTable('projects', {
        id: 'serial',
        name: 'text',
        client_name: 'text',
        created_at: 'timestamptz',
        user_id: 'integer'
      });
      console.log('Projects table created using schema API');
    } else {
      console.log('Projects table created successfully');
    }
    
    // Create brand_concepts table
    console.log('Creating brand_concepts table...');
    const { error: conceptsError } = await supabase.rpc('execute_sql', {
      sql_query: `
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
      `
    });
    
    if (conceptsError) {
      console.error('Error creating brand_concepts table:', conceptsError);
      // Try alternative approach
      console.log('Trying alternative approach for brand_concepts table...');
      await supabase.schema.createTable('brand_concepts', {
        id: 'serial',
        project_id: 'integer',
        name: 'text',
        created_at: 'timestamptz',
        brand_inputs: 'jsonb',
        brand_output: 'jsonb',
        is_active: 'boolean'
      });
      console.log('Brand concepts table created using schema API');
    } else {
      console.log('Brand concepts table created successfully');
    }
    
    console.log('Tables creation process completed');
    
  } catch (error) {
    console.error('Error creating tables:', error.message);
  }
}

createTables();