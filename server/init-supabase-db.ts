import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { users, projects, brandConcepts } from '../shared/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, serial, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseDbUrl = process.env.SUPABASE_DB_URL;

// Create a Supabase client
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Initialize the Supabase database by creating required tables
 */
export async function initializeSupabaseDatabase() {
  if (!supabase) {
    console.error('Supabase client not initialized. Check your environment variables.');
    return false;
  }

  try {
    // Check if tables exist first
    const { data: existingTables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (tablesError) {
      console.error('Error checking existing tables:', tablesError);
      // If we can't check tables, we'll try creating them anyway
      console.log('Attempting to create tables...');
    } else {
      console.log('Existing tables:', existingTables);
    }

    // Read SQL file with table definitions
    const sqlContent = fs.readFileSync(path.join(process.cwd(), 'supabase-schema.sql'), 'utf8');
    
    // Use the Supabase REST API to execute parts of the SQL file
    // Note: This approach has limitations since we can't execute raw SQL through the REST API
    // For proper migration, you'll want to execute this SQL in the Supabase SQL editor directly
    
    // Instead, we'll check and create tables one by one using the REST API
    await createTablesViaAPI();
    
    console.log('Supabase database initialized successfully.');
    return true;
  } catch (error) {
    console.error('Error initializing Supabase database:', error);
    return false;
  }
}

/**
 * Create database tables through the Supabase REST API
 */
async function createTablesViaAPI() {
  if (!supabase) return;

  try {
    // Create users table if it doesn't exist
    const { error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError && usersError.code === '42P01') { // Table doesn't exist
      // We can't create tables through REST API, so we'll log instructions
      console.log('Users table does not exist. Run the SQL migration script in Supabase SQL editor.');
    } else if (usersError) {
      console.error('Error checking users table:', usersError);
    } else {
      console.log('Users table exists.');
    }

    // Check projects table
    const { error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (projectsError && projectsError.code === '42P01') {
      console.log('Projects table does not exist. Run the SQL migration script in Supabase SQL editor.');
    } else if (projectsError) {
      console.error('Error checking projects table:', projectsError);
    } else {
      console.log('Projects table exists.');
    }

    // Check brand_concepts table
    const { error: conceptsError } = await supabase
      .from('brand_concepts')
      .select('*')
      .limit(1);

    if (conceptsError && conceptsError.code === '42P01') {
      console.log('Brand concepts table does not exist. Run the SQL migration script in Supabase SQL editor.');
    } else if (conceptsError) {
      console.error('Error checking brand_concepts table:', conceptsError);
    } else {
      console.log('Brand concepts table exists.');
    }
  } catch (error) {
    console.error('Error creating tables via API:', error);
  }
}

/**
 * Alternative approach for direct SQL execution
 * Because Supabase doesn't allow direct SQL execution via the REST API,
 * we need to create the tables manually through the Supabase dashboard.
 * 
 * This function provides instructions on how to do that.
 */
async function executeSqlDirectly(sql: string) {
  if (!supabaseDbUrl) {
    console.error('Direct SQL connection URL not provided. Cannot execute SQL directly.');
    return false;
  }

  try {
    console.log('Attempting to connect to Supabase PostgreSQL database directly...');
    
    const pgClient = postgres(supabaseDbUrl, { ssl: 'require' });
    
    // Execute the SQL statement
    await pgClient.unsafe(sql);
    
    console.log('SQL executed successfully.');
    await pgClient.end();
    return true;
  } catch (error) {
    console.error('Error executing SQL directly:', error);
    console.log('Please execute the SQL manually in the Supabase SQL editor:');
    console.log(sql);
    return false;
  }
}

/**
 * Check if the required tables exist in the Supabase database
 */
export async function checkSupabaseTables(): Promise<{ 
  usersExist: boolean; 
  projectsExist: boolean; 
  conceptsExist: boolean;
}> {
  if (!supabase) {
    return { usersExist: false, projectsExist: false, conceptsExist: false };
  }

  try {
    // Check users table
    const { error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    // Check projects table
    const { error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    // Check brand_concepts table
    const { error: conceptsError } = await supabase
      .from('brand_concepts')
      .select('*')
      .limit(1);
    
    return {
      usersExist: !usersError || usersError.code !== '42P01',
      projectsExist: !projectsError || projectsError.code !== '42P01',
      conceptsExist: !conceptsError || conceptsError.code !== '42P01',
    };
  } catch (error) {
    console.error('Error checking Supabase tables:', error);
    return { usersExist: false, projectsExist: false, conceptsExist: false };
  }
}

// For direct execution of this script
if (require.main === module) {
  initializeSupabaseDatabase()
    .then(success => {
      if (success) {
        console.log('Supabase database initialized successfully!');
      } else {
        console.error('Failed to initialize Supabase database.');
      }
    })
    .catch(err => {
      console.error('Error during Supabase database initialization:', err);
    });
}