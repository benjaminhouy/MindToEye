import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or API key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Direct SQL query
    console.log('Test 1: Running direct SQL query');
    const { data: tableData, error: tableError } = await supabase.rpc(
      'list_tables',
      { schema_name: 'public' }
    );
    
    if (tableError) {
      console.error('Error listing tables:', tableError);
    } else {
      console.log('Tables in public schema:', tableData);
    }

    // Test 2: Try to query projects table
    console.log('\nTest 2: Querying projects table');
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5);
    
    if (projectsError) {
      console.error('Error querying projects:', projectsError);
    } else {
      console.log('Projects data:', projectsData);
    }

    // Test 3: Try explicitly specifying public schema
    console.log('\nTest 3: Querying with explicit schema');
    const { data: schemaData, error: schemaError } = await supabase
      .from('public.projects')
      .select('*')
      .limit(5);
    
    if (schemaError) {
      console.error('Error querying with explicit schema:', schemaError);
    } else {
      console.log('Projects with explicit schema:', schemaData);
    }

    // Test 4: Try running raw SQL
    console.log('\nTest 4: Running raw SQL query');
    const { data: rawData, error: rawError } = await supabase
      .rpc('execute_sql', { sql: 'SELECT * FROM projects LIMIT 5' });
    
    if (rawError) {
      console.error('Error running raw SQL:', rawError);
    } else {
      console.log('Raw SQL result:', rawData);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testSupabase();