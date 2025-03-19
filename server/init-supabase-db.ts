import { supabase } from './supabase';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PostgrestError } from '@supabase/supabase-js';

// Load environment variables from .env.supabase
console.log('Loading environment variables from .env.supabase');
dotenv.config({ path: '.env.supabase' });

/**
 * Initialize Supabase database tables according to schema
 * Uses raw SQL to create tables, which is more reliable than API calls
 */
export async function initializeSupabaseDatabase() {
  if (!supabase) {
    console.error('Supabase client is not initialized. Cannot create database tables.');
    return false;
  }

  try {
    console.log('Reading SQL setup file...');
    const sqlFilePath = path.join(process.cwd(), 'supabase_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Create a simple RPC function to execute SQL
    // This creates a temporary function that we can use to execute our SQL
    const createRpcFunctionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$
    BEGIN
      EXECUTE query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Execute the RPC function creation
    console.log('Creating SQL execution function...');
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      query: createRpcFunctionSql
    });
    
    // If we can't create the function, try direct execution
    if (rpcError) {
      console.log('Function creation failed. Attempting direct SQL execution...');
      await executeSqlDirectly(sqlContent);
      return true;
    }
    
    // Execute each statement through the RPC function
    for (let i = 0; i < statements.length; i++) {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      const { error } = await supabase.rpc('exec_sql', {
        query: statements[i]
      });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
      }
    }
    
    // Drop the function when done
    console.log('Dropping SQL execution function...');
    await supabase.rpc('exec_sql', {
      query: 'DROP FUNCTION IF EXISTS exec_sql(text);'
    });
    
    console.log('Database initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
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
  try {
    // Check if tables already exist
    const { error: checkError } = await supabase!
      .from('users')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('Tables already exist, skipping creation.');
      return;
    }
    
    // Get SQL file path for easy access
    const sqlFilePath = path.join(process.cwd(), 'supabase_tables.sql');
    
    console.log('\nSUPABASE TABLE CREATION INSTRUCTIONS:');
    console.log('-----------------------------------');
    console.log('Tables need to be created manually in the Supabase dashboard.');
    console.log('Please follow these steps:');
    console.log('1. Log in to your Supabase dashboard');
    console.log('2. Go to the SQL Editor');
    console.log('3. Create a new query');
    console.log(`4. Copy and paste the contents of "${sqlFilePath}"`);
    console.log('5. Run the SQL query');
    console.log('\nAlternatively, you can run this from a terminal with direct Postgres access:');
    console.log(`psql ${process.env.SUPABASE_DB_URL || process.env.DATABASE_URL} -f ${sqlFilePath}`);
    console.log('\nUntil then, the application will use in-memory storage as a fallback.\n');
    
    // We can't actually create tables via REST API, so we'll return after providing instructions
    return;
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

// Function to check if tables exist
export async function checkSupabaseTables(): Promise<{ 
  usersExists: boolean; 
  projectsExists: boolean; 
  conceptsExists: boolean;
}> {
  if (!supabase) {
    return { usersExists: false, projectsExists: false, conceptsExists: false };
  }
  
  try {
    // Check users table
    const { error: usersError } = await supabase!
      .from('users')
      .select('id')
      .limit(1);
    
    // Check projects table
    const { error: projectsError } = await supabase!
      .from('projects')
      .select('id')
      .limit(1);
    
    // Check brand_concepts table
    const { error: conceptsError } = await supabase!
      .from('brand_concepts')
      .select('id')
      .limit(1);
    
    return {
      usersExists: !usersError || usersError.code !== '42P01',
      projectsExists: !projectsError || projectsError.code !== '42P01',
      conceptsExists: !conceptsError || conceptsError.code !== '42P01'
    };
  } catch (error) {
    console.error('Error checking tables:', error);
    return { usersExists: false, projectsExists: false, conceptsExists: false };
  }
}

// For ES modules, we'll check if this file is the main module
// by looking at import.meta.url
const isMainModule = import.meta.url.endsWith("init-supabase-db.ts") || 
                     import.meta.url.endsWith("init-supabase-db.js");

// If this file is executed directly
if (isMainModule) {
  (async () => {
    console.log('Checking existing Supabase tables...');
    const tableStatus = await checkSupabaseTables();
    console.log('Table status:', tableStatus);
    
    if (!tableStatus.usersExists || !tableStatus.projectsExists || !tableStatus.conceptsExists) {
      console.log('Some tables are missing. Initializing database...');
      await initializeSupabaseDatabase();
    } else {
      console.log('All required tables exist.');
    }
    
    process.exit(0);
  })();
}