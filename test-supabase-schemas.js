// Test script to check alternative schemas in Supabase
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Get Supabase connection details from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// List of schemas to try
const schemasToTry = [
  'public', 
  'auth', 
  'storage',
  '', // Try with no schema specified
  'supabase_migrations',
  'supabase_auth'
];

async function testSchemas() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials');
    return;
  }

  console.log('Testing different Supabase schemas...');
  
  for (const schema of schemasToTry) {
    console.log(`\nTesting schema: ${schema || '(empty)'}`);
    
    // Initialize Supabase client with specific schema
    const options = {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      },
      global: {
        headers: {
          'x-testing-schema': schema
        }
      }
    };
    
    if (schema) {
      options.db = { schema };
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, options);
    
    try {
      // Try to get users
      console.log(`Testing users table in ${schema || 'default'} schema...`);
      
      let formattedTable = schema ? `${schema}.users` : 'users';
      if (schema === '') formattedTable = 'users';
      
      const { data: users, error: usersError } = await supabase
        .from(formattedTable)
        .select('id, username')
        .limit(1);
      
      if (usersError) {
        console.error(`  Error accessing users: ${usersError.message}`);
      } else {
        console.log(`  Success! Found ${users.length} users`);
        console.log(`  Data: ${JSON.stringify(users)}`);
      }
      
      // Try to get projects
      console.log(`Testing projects table in ${schema || 'default'} schema...`);
      
      formattedTable = schema ? `${schema}.projects` : 'projects';
      if (schema === '') formattedTable = 'projects';
      
      const { data: projects, error: projectsError } = await supabase
        .from(formattedTable)
        .select('id, name')
        .limit(1);
      
      if (projectsError) {
        console.error(`  Error accessing projects: ${projectsError.message}`);
      } else {
        console.log(`  Success! Found ${projects.length} projects`);
        console.log(`  Data: ${JSON.stringify(projects)}`);
      }
      
      // Try to get brand_concepts
      console.log(`Testing brand_concepts table in ${schema || 'default'} schema...`);
      
      formattedTable = schema ? `${schema}.brand_concepts` : 'brand_concepts';
      if (schema === '') formattedTable = 'brand_concepts';
      
      const { data: concepts, error: conceptsError } = await supabase
        .from(formattedTable)
        .select('id, name')
        .limit(1);
      
      if (conceptsError) {
        console.error(`  Error accessing brand_concepts: ${conceptsError.message}`);
      } else {
        console.log(`  Success! Found ${concepts.length} brand concepts`);
        console.log(`  Data: ${JSON.stringify(concepts)}`);
      }
    } catch (error) {
      console.error(`Error testing schema ${schema}:`, error);
    }
  }
}

testSchemas();