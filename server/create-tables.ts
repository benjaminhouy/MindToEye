import postgres from 'postgres';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.supabase
config({ path: '.env.supabase' });

async function createTables() {
  // Get the database URL from environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL is not set in environment variables.');
    process.exit(1);
  }
  
  console.log('Connecting to PostgreSQL database...');
  
  // Create a connection pool
  const sql = postgres(databaseUrl);
  
  try {
    // Check if tables already exist
    console.log('Checking if tables already exist...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as "usersExists",
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
      ) as "projectsExists",
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'brand_concepts'
      ) as "conceptsExists"
    `;
    
    const { usersExists, projectsExists, conceptsExists } = tableCheck[0];
    
    if (usersExists && projectsExists && conceptsExists) {
      console.log('All tables already exist. No action needed.');
      await sql.end();
      return;
    }
    
    // Read the SQL file
    console.log('Reading SQL setup file...');
    const sqlFilePath = path.join(process.cwd(), 'supabase_tables.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf-8');
    
    // Split SQL by semicolons, skipping empty statements
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${sqlStatements.length} SQL statements to execute`);
    
    // Execute each SQL statement
    for (const statement of sqlStatements) {
      try {
        console.log(`Executing SQL: ${statement.substring(0, 60)}...`);
        await sql.unsafe(statement);
        console.log('Statement executed successfully');
      } catch (error) {
        console.error('Error executing SQL statement:', error);
        // Continue with next statement
      }
    }
    
    console.log('All SQL statements executed. Tables should be created successfully.');
    
  } catch (error) {
    console.error('Database operation failed:', error);
  } finally {
    // Close the connection pool
    await sql.end();
  }
}

createTables().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});