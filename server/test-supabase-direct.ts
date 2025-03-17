import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables from both .env files
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.supabase' });

async function testSupabaseDirectConnection() {
  try {
    // Hardcoded connection string for testing (password masked in output)
    const directUrl = "postgresql://postgres:05oMFMTuqkwvc2NC@fdgqujdodyivsbzrtyet.supabase.co:5432/postgres";
    
    console.log('Testing Supabase Direct PostgreSQL connection...');
    console.log('Connection URL:', directUrl.replace(/:[^:]*@/, ':****@')); // Hide password in logs
    
    const sql = postgres(directUrl, { 
      ssl: 'require'
    });
    
    // Try to query the database
    const result = await sql`SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'`;
    
    console.log('Available tables in public schema:');
    console.log(result);
    
    if (result.length === 0) {
      console.log('No tables found in public schema');
      
      // Create tables if none exist
      console.log('Creating tables...');
      
      // Create users table
      await sql`
        CREATE TABLE IF NOT EXISTS public.users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        );
      `;
      console.log('Users table created');
      
      // Create projects table
      await sql`
        CREATE TABLE IF NOT EXISTS public.projects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          client_name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          user_id INTEGER NOT NULL,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `;
      console.log('Projects table created');
      
      // Create brand_concepts table
      await sql`
        CREATE TABLE IF NOT EXISTS public.brand_concepts (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          brand_inputs JSONB NOT NULL,
          brand_output JSONB NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        );
      `;
      console.log('Brand concepts table created');
      
      // Insert demo user
      await sql`
        INSERT INTO public.users (username, password)
        VALUES ('demo', 'demo123')
        ON CONFLICT (username) DO NOTHING;
      `;
      console.log('Demo user created');
      
      // Insert sample projects for demo user
      await sql`
        INSERT INTO projects (name, client_name, user_id)
        SELECT 'Eco Threads Rebrand', 'Sustainable Fashion Co.', id FROM users WHERE username = 'demo'
        UNION ALL
        SELECT 'TechVision App Launch', 'TechVision Inc.', id FROM users WHERE username = 'demo'
        UNION ALL
        SELECT 'Fresh Bites Cafe', 'Healthy Foods LLC', id FROM users WHERE username = 'demo';
      `;
      console.log('Sample projects created');
    }
    
    // Try to query users table
    try {
      const usersResult = await sql`SELECT * FROM users LIMIT 10`;
      console.log('Users table exists, data:', usersResult);
    } catch (error: any) {
      console.error('Error querying users table:', error.message);
    }
    
    // Try to query projects table
    try {
      const projectsResult = await sql`SELECT * FROM projects LIMIT 10`;
      console.log('Projects table exists, data:', projectsResult);
    } catch (error: any) {
      console.error('Error querying projects table:', error.message);
    }
    
    // Try to query brand_concepts table
    try {
      const conceptsResult = await sql`SELECT * FROM brand_concepts LIMIT 10`;
      console.log('Brand concepts table exists, data:', conceptsResult);
    } catch (error: any) {
      console.error('Error querying brand_concepts table:', error.message);
    }
    
    // Cleanup
    await sql.end();
    console.log('Supabase Direct PostgreSQL connection test complete');
    
  } catch (error: any) {
    console.error('Error testing Supabase Direct PostgreSQL connection:', error.message);
  }
}

// Execute the test
testSupabaseDirectConnection();