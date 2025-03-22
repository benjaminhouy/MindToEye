// Test script to check the Supabase database schema
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Get Supabase connection details from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function checkSupabaseSchema() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    return;
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('Checking Supabase schema information...');
    
    // Query to list all tables in the database
    const { data: tables, error: tablesError } = await supabase
      .rpc('list_tables');
    
    if (tablesError) {
      console.error('Error getting tables:', tablesError);
      
      // Fallback: Try to select from information_schema
      console.log('Trying alternative approach to list tables...');
      const { data: schemaInfo, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_schema, table_name')
        .eq('table_type', 'BASE TABLE');
      
      if (schemaError) {
        console.error('Error accessing information_schema:', schemaError);
      } else {
        console.log('Tables in database:');
        console.table(schemaInfo);
      }
    } else {
      console.log('Tables in database:');
      console.table(tables);
    }
    
    // Try direct queries to each table to see if they exist
    console.log('\nTesting direct table access:');
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    console.log('Users table:', usersError ? 'ERROR' : 'OK');
    if (usersError) console.error('- Users error:', usersError.message);
    else console.log('- Found users:', users.length);
    
    // Test projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    console.log('Projects table:', projectsError ? 'ERROR' : 'OK');
    if (projectsError) console.error('- Projects error:', projectsError.message);
    else console.log('- Found projects:', projects.length);
    
    // Test brand_concepts table
    const { data: concepts, error: conceptsError } = await supabase
      .from('brand_concepts')
      .select('id')
      .limit(1);
    
    console.log('Brand concepts table:', conceptsError ? 'ERROR' : 'OK');
    if (conceptsError) console.error('- Brand concepts error:', conceptsError.message);
    else console.log('- Found concepts:', concepts.length);
    
    // Try direct SQL query using PostgreSQL
    console.log('\nTrying direct SQL query via RPC:');
    const { data: sqlResult, error: sqlError } = await supabase
      .rpc('execute_sql', { sql: 'SELECT * FROM projects LIMIT 1' });
    
    if (sqlError) {
      console.error('SQL query error:', sqlError);
    } else {
      console.log('SQL query result:', sqlResult);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSupabaseSchema();