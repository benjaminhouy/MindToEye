// Simple script to check database connection
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.supabase file
const envPath = path.join(process.cwd(), '.env.supabase');
if (fs.existsSync(envPath)) {
  console.log('Loading env from:', envPath);
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envVars = envFile.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
        process.env[key.trim()] = value.trim();
      }
      return acc;
    }, {});
  
  console.log('Loaded environment variables:', Object.keys(envVars).join(', '));
} else {
  console.log('No .env.supabase file found');
}

async function checkConnection() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase credentials');
      return;
    }
    
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: false
        }
      }
    );
    
    console.log('Checking Supabase connection...');
    
    // Try to query the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.error('Error querying users table:', usersError);
    } else {
      console.log('Successfully queried users table:', users);
    }
    
    // Try to query the projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5);
    
    if (projectsError) {
      console.error('Error querying projects table:', projectsError);
    } else {
      console.log('Successfully queried projects table:', projects);
    }
    
    // Try to query the brand_concepts table
    const { data: concepts, error: conceptsError } = await supabase
      .from('brand_concepts')
      .select('*')
      .limit(5);
    
    if (conceptsError) {
      console.error('Error querying brand_concepts table:', conceptsError);
    } else {
      console.log('Successfully queried brand_concepts table:', concepts);
    }
    
  } catch (error) {
    console.error('Error checking connection:', error);
  }
}

checkConnection().catch(err => {
  console.error('Unexpected error:', err);
});