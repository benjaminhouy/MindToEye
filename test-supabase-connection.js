import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

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

// Test Supabase REST API connection
async function testSupabaseRestApi() {
  console.log('\n--- Testing Supabase REST API Connection ---');
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('projects').select('*').limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase REST API:', error.message);
      return false;
    }
    
    console.log('Successfully connected to Supabase REST API!');
    console.log('Sample data:', data);
    return true;
  } catch (error) {
    console.error('Error connecting to Supabase REST API:', error.message);
    return false;
  }
}

// Test direct database connection
async function testDbConnection() {
  console.log('\n--- Testing Direct Database Connection ---');
  
  if (!supabaseDbUrl) {
    console.error('SUPABASE_DB_URL is not defined');
    return false;
  }
  
  const client = new pg.Client({
    connectionString: supabaseDbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Successfully connected to Supabase PostgreSQL database!');
    
    // Try running a simple query
    const res = await client.query('SELECT current_database() as db_name');
    console.log('Connected to database:', res.rows[0].db_name);
    
    await client.end();
    return true;
  } catch (error) {
    console.error('Error connecting to Supabase PostgreSQL database:', error.message);
    await client.end().catch(() => {});
    return false;
  }
}

// Run tests
async function runTests() {
  const restApiSuccess = await testSupabaseRestApi();
  const dbSuccess = await testDbConnection();
  
  console.log('\n--- Test Results ---');
  console.log('Supabase REST API Connection:', restApiSuccess ? 'SUCCESS ✅' : 'FAILED ❌');
  console.log('Supabase Database Connection:', dbSuccess ? 'SUCCESS ✅' : 'FAILED ❌');
  
  if (!restApiSuccess || !dbSuccess) {
    console.log('\n⚠️ Some tests failed. Please check your Supabase credentials and network connectivity.');
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed! Your Supabase connection is working properly.');
}

runTests();