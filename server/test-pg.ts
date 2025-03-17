import postgres from 'postgres';

async function testPgConnection() {
  try {
    // Test direct PostgreSQL connection
    const directUrl = process.env.DATABASE_URL;
    
    if (!directUrl) {
      console.error('DATABASE_URL not set');
      return;
    }
    
    console.log('Testing direct PostgreSQL connection...');
    console.log('Connection URL:', directUrl);
    
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
    }
    
    // Try to query users table
    try {
      const usersResult = await sql`SELECT * FROM users LIMIT 1`;
      console.log('Users table exists, data:', usersResult);
    } catch (err) {
      console.error('Error querying users table:', err.message);
    }
    
    // Try to query projects table
    try {
      const projectsResult = await sql`SELECT * FROM projects LIMIT 1`;
      console.log('Projects table exists, data:', projectsResult);
    } catch (err) {
      console.error('Error querying projects table:', err.message);
    }
    
    // Cleanup
    await sql.end();
    console.log('PostgreSQL connection test complete');
    
  } catch (error) {
    console.error('Error testing PostgreSQL connection:', error);
  }
}

// Execute the test
testPgConnection();