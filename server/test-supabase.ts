import { createClient } from '@supabase/supabase-js';

async function testSupabase() {
  try {
    // Get Supabase configuration from environment
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or key not set');
      return;
    }
    
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', supabaseUrl);
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true 
      },
    });
    
    // Test connection by trying to fetch schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (schemaError) {
      console.error('Supabase connection error:', schemaError.message);
      console.error('Error details:', schemaError);
      
      // Try to check if the schema exists at all
      console.log('Checking available schemas...');
      try {
        const { data: schemas } = await supabase.rpc('get_schemas');
        console.log('Available schemas:', schemas);
      } catch (err) {
        console.error('Error querying schemas:', err.message);
      }
    } else {
      console.log('Successfully connected to Supabase', schemaData);
      
      // If connection works, try to query tables
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (usersError) {
        console.error('Error querying users:', usersError.message);
      } else {
        console.log('Users table data:', usersData);
      }
    }
    
    console.log('Supabase connection test complete');
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }
}

// Execute the test
testSupabase();