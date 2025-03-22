// Simple script to test Supabase connection
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not set');

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not set in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Try to query the postgres schema information
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error querying projects:', error);
      
      // Try to get the schema info
      console.log('Checking available schemas...');
      const { data: schemaData, error: schemaError } = await supabase.rpc('get_schemas');
      
      if (schemaError) {
        console.error('Could not get schema information:', schemaError);
      } else {
        console.log('Available schemas:', schemaData);
      }
      
      return;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Projects data:', data);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();