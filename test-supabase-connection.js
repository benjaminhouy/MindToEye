// Test script to verify Supabase connectivity
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Get Supabase connection details from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

async function testConnection() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    return;
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl.substring(0, 20)}...`);
  console.log('Anon Key starts with:', supabaseKey.substring(0, 5) + '...');
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  });

  try {
    // Test 1: Check service status
    console.log('\nTest 1: Checking service status...');
    const { error: statusError } = await supabase.from('_service_status').select('*').limit(1);
    
    if (statusError) {
      console.log('✓ Supabase connection works (expected error on non-existent _service_status table)');
    } else {
      console.log('✓ Supabase connection works');
    }

    // Test 2: Try to list tables in public schema
    console.log('\nTest 2: Listing available tables in database...');
    try {
      const { data, error } = await supabase.rpc('list_tables');
      if (error) {
        console.error('✗ Could not list tables:', error.message);
        console.log('Note: The list_tables RPC function may not be available.');
        
        // Fallback: Try to access some common tables
        console.log('\nTrying to access tables directly:');
        
        const commonTables = ['users', 'projects', 'brand_concepts'];
        for (const table of commonTables) {
          try {
            const { error: tableError } = await supabase.from(table).select('count').limit(1);
            if (tableError && tableError.code === '42P01') {
              console.log(`✗ Table '${table}' does not exist`);
            } else if (tableError) {
              console.log(`? Table '${table}': ${tableError.message}`);
            } else {
              console.log(`✓ Table '${table}' exists`);
            }
          } catch (e) {
            console.error(`Error testing table ${table}:`, e);
          }
        }
      } else {
        console.log('Available tables:', data);
      }
    } catch (e) {
      console.error('Error listing tables:', e);
    }

    // Test 3: Try inserting a test record
    console.log('\nTest 3: Try creating a test user...');
    try {
      // Generate a random username to avoid conflicts
      const testUsername = 'test_' + Math.floor(Math.random() * 10000);
      
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({ 
          username: testUsername, 
          password: 'test_password' 
        })
        .select();
        
      if (insertError) {
        if (insertError.code === '42P01') {
          console.error('✗ Could not create test user: Table does not exist');
        } else {
          console.error('✗ Could not create test user:', insertError.message);
        }
      } else {
        console.log('✓ Successfully created test user:', insertData);
        
        // Clean up test user
        await supabase.from('users').delete().eq('username', testUsername);
        console.log('✓ Test user removed');
      }
    } catch (e) {
      console.error('Error testing user insertion:', e);
    }
    
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }
}

testConnection().catch(console.error);