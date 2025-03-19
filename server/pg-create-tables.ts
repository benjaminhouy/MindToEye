import pg from 'pg';
const { Client } = pg;
import * as fs from 'fs/promises';
import * as path from 'path';

// Use the provided connection string directly
const connectionString = 'postgresql://postgres:05oMFMTuqkwvc2NC@db.fdgqujdodyivsbzrtyet.supabase.co:5432/postgres';

async function createTables() {
  console.log('Connecting to PostgreSQL database...');
  
  // Create a client
  const client = new Client({
    connectionString
  });
  
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Check if tables already exist
    console.log('Checking if tables already exist...');
    const tableCheckQuery = `
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
    
    const tableCheckResult = await client.query(tableCheckQuery);
    const { usersexists, projectsexists, conceptsexists } = tableCheckResult.rows[0];
    
    if (usersexists && projectsexists && conceptsexists) {
      console.log('All tables already exist. No action needed.');
      await client.end();
      return;
    }
    
    console.log('Some tables are missing. Creating tables...');
    
    // Read the SQL file
    console.log('Reading SQL setup file...');
    const sqlFilePath = path.join(process.cwd(), 'supabase_tables.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf-8');
    
    // Execute the entire SQL script
    console.log('Executing SQL script...');
    await client.query(sqlContent);
    console.log('SQL script executed successfully!');
    
    // Verify tables were created
    const verifyResult = await client.query(tableCheckQuery);
    const { usersexists: usersCreated, projectsexists: projectsCreated, conceptsexists: conceptsCreated } = verifyResult.rows[0];
    
    console.log('Tables creation status:');
    console.log(`Users table: ${usersCreated ? 'Created' : 'Failed'}`);
    console.log(`Projects table: ${projectsCreated ? 'Created' : 'Failed'}`);
    console.log(`Brand Concepts table: ${conceptsCreated ? 'Created' : 'Failed'}`);
    
  } catch (error) {
    console.error('Database operation failed:', error);
  } finally {
    // Close the connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Execute the function
createTables().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});