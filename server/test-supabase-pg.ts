import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables from both .env files
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.supabase' });

async function testSupabasePgConnection() {
  try {
    // Test direct PostgreSQL connection to Supabase
    const directUrl = process.env.DATABASE_URL;
    
    if (!directUrl) {
      console.error('DATABASE_URL not set');
      return;
    }
    
    console.log('Testing Supabase PostgreSQL connection...');
    console.log('Connection URL:', directUrl.replace(/:[^:]*@/, ':****@')); // Hide password in logs
    
    const sql = postgres(directUrl, { 
      ssl: 'require',
      debug: true
    });
    
    // Try to query the database
    const result = await sql`SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'`;
    
    console.log('Available tables in public schema:');
    console.log(result);
    
    if (result.length === 0) {
      console.log('No tables found in public schema');
    } else {
      // Create schema if needed
      try {
        await sql`
          -- Create Users Table if not exists
          CREATE TABLE IF NOT EXISTS public.users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
          );

          -- Create Projects Table if not exists
          CREATE TABLE IF NOT EXISTS public.projects (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            client_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            user_id INTEGER NOT NULL,
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          );

          -- Create Brand Concepts Table if not exists
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
        console.log('Schema created or already exists');

        // Insert demo user if not exists
        await sql`
          INSERT INTO public.users (username, password)
          VALUES ('demo', 'demo123')
          ON CONFLICT (username) DO NOTHING;
        `;
        console.log('Demo user created or already exists');
      } catch (err) {
        console.error('Error creating schema:', err.message);
      }
    }
    
    // Try to query users table
    try {
      const usersResult = await sql`SELECT * FROM users LIMIT 10`;
      console.log('Users table exists, data:', usersResult);
    } catch (err) {
      console.error('Error querying users table:', err.message);
    }
    
    // Try to query projects table
    try {
      const projectsResult = await sql`SELECT * FROM projects LIMIT 10`;
      console.log('Projects table exists, data:', projectsResult);
    } catch (err) {
      console.error('Error querying projects table:', err.message);
    }
    
    // Try to query brand_concepts table
    try {
      const conceptsResult = await sql`SELECT * FROM brand_concepts LIMIT 10`;
      console.log('Brand concepts table exists, data:', conceptsResult);
    } catch (err) {
      console.error('Error querying brand_concepts table:', err.message);
    }
    
    // Cleanup
    await sql.end();
    console.log('Supabase PostgreSQL connection test complete');
    
  } catch (error) {
    console.error('Error testing Supabase PostgreSQL connection:', error);
  }
}

// Execute the test
testSupabasePgConnection();