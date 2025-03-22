import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

// Load environment variables
dotenv.config();

// Log supabase environment variables (without showing the actual values)
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_DB_URL exists:', !!process.env.SUPABASE_DB_URL);

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseDbUrl = process.env.SUPABASE_DB_URL;

// Test Supabase API connection using a simple request
async function testSupabaseConnection() {
  console.log('\n--- Testing Basic Supabase Connection ---');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL or SUPABASE_ANON_KEY is not defined');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try a simple request that should always work with any Supabase project
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      return false;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Authentication service is available.');
    
    // Simple check to see if a table exists by trying to select from it (not using count to avoid parsing issues)
    console.log('\nTrying to access projects table (which may not exist yet)...');
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (projectsError) {
      if (projectsError.message.includes('does not exist')) {
        console.log('Projects table does not exist yet. You will need to create it as part of the migration.');
      } else {
        console.log('Error accessing projects table:', projectsError.message);
      }
    } else {
      console.log('Projects table exists and is accessible!');
      console.log('Sample data:', projectsData);
    }
    
    return true;
  } catch (error: any) {
    console.error('Unexpected error connecting to Supabase:', error.message);
    return false;
  }
}

// Test PostgreSQL direct connection (needed for migrations)
async function testDatabaseConnection() {
  console.log('\n--- Testing Direct PostgreSQL Connection ---');
  
  if (!supabaseDbUrl) {
    console.error('SUPABASE_DB_URL is not defined');
    return false;
  }
  
  // Create a connection pool with SSL settings
  const pool = new Pool({
    connectionString: supabaseDbUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase connections from most environments
    }
  });
  
  try {
    // Test the connection with a simple query
    const client = await pool.connect();
    try {
      console.log('Successfully connected to PostgreSQL database!');
      
      const versionResult = await client.query('SELECT version()');
      console.log('PostgreSQL version:', versionResult.rows[0].version);
      
      return true;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: any) {
    console.error('Error connecting to PostgreSQL database:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that the SUPABASE_DB_URL is correct');
    console.log('2. Make sure your IP is allowed in the Supabase database settings');
    console.log('3. Check that the database password is correct');
    
    await pool.end().catch(() => {});
    return false;
  }
}

// Run tests
async function runTests() {
  const apiSuccess = await testSupabaseConnection();
  const dbSuccess = await testDatabaseConnection();
  
  console.log('\n--- Test Results ---');
  console.log('Supabase API Connection:', apiSuccess ? 'SUCCESS ✅' : 'FAILED ❌');
  console.log('Supabase Database Connection:', dbSuccess ? 'SUCCESS ✅' : 'FAILED ❌');
  
  if (!apiSuccess || !dbSuccess) {
    console.log('\n⚠️ Some tests failed. Please check your Supabase credentials and network connectivity.');
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed! Your Supabase connection is working properly.');
}

runTests();