import postgres from 'postgres';

async function testPgConnection() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('DATABASE_URL environment variable is not set');
      process.exit(1);
    }
    
    console.log('Connecting to PostgreSQL using DATABASE_URL...');
    const sql = postgres(databaseUrl);
    
    // Test 1: List tables in the public schema
    console.log('Test 1: Listing tables in public schema');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables in public schema:', tables);
    
    // Test 2: Try to query the projects table
    console.log('\nTest 2: Querying projects table');
    const projects = await sql`
      SELECT * FROM projects LIMIT 5
    `;
    console.log('Projects:', projects);
    
    // Clean up
    await sql.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
  }
}

testPgConnection();