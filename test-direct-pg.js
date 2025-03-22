// Direct PostgreSQL connection test 
import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

// Get PostgreSQL connection details
const dbUrl = process.env.DATABASE_URL;

async function testDirectPgConnection() {
  if (!dbUrl) {
    console.error('Error: Database URL not provided');
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    
    // List all schemas
    console.log('\nListing all schemas:');
    const schemaResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata
    `);
    
    console.log('Available schemas:');
    schemaResult.rows.forEach(row => {
      console.log(`- ${row.schema_name}`);
    });
    
    // List all tables in all schemas
    console.log('\nListing all tables:');
    const tableResult = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    
    console.log('Available tables:');
    tableResult.rows.forEach(row => {
      console.log(`- ${row.table_schema}.${row.table_name}`);
    });
    
    // Test if our tables exist in any schema
    console.log('\nChecking specific tables:');
    
    // Check users table
    try {
      const usersResult = await pool.query('SELECT COUNT(*) FROM public.users');
      console.log('users table exists in public schema. Count:', usersResult.rows[0].count);
    } catch (err) {
      console.error('Error accessing public.users:', err.message);
      
      // Try to find users table in other schemas
      try {
        const findUsersResult = await pool.query(`
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_name = 'users'
        `);
        
        if (findUsersResult.rows.length > 0) {
          console.log('Found users table in:');
          findUsersResult.rows.forEach(row => {
            console.log(`- ${row.table_schema}`);
          });
        } else {
          console.log('users table not found in any schema');
        }
      } catch (findErr) {
        console.error('Error finding users table:', findErr.message);
      }
    }
    
    // Check projects table
    try {
      const projectsResult = await pool.query('SELECT COUNT(*) FROM public.projects');
      console.log('projects table exists in public schema. Count:', projectsResult.rows[0].count);
    } catch (err) {
      console.error('Error accessing public.projects:', err.message);
      
      // Try to find projects table in other schemas
      try {
        const findProjectsResult = await pool.query(`
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_name = 'projects'
        `);
        
        if (findProjectsResult.rows.length > 0) {
          console.log('Found projects table in:');
          findProjectsResult.rows.forEach(row => {
            console.log(`- ${row.table_schema}`);
          });
        } else {
          console.log('projects table not found in any schema');
        }
      } catch (findErr) {
        console.error('Error finding projects table:', findErr.message);
      }
    }
    
    // Check brand_concepts table
    try {
      const conceptsResult = await pool.query('SELECT COUNT(*) FROM public.brand_concepts');
      console.log('brand_concepts table exists in public schema. Count:', conceptsResult.rows[0].count);
    } catch (err) {
      console.error('Error accessing public.brand_concepts:', err.message);
      
      // Try to find brand_concepts table in other schemas
      try {
        const findConceptsResult = await pool.query(`
          SELECT table_schema, table_name 
          FROM information_schema.tables 
          WHERE table_name = 'brand_concepts'
        `);
        
        if (findConceptsResult.rows.length > 0) {
          console.log('Found brand_concepts table in:');
          findConceptsResult.rows.forEach(row => {
            console.log(`- ${row.table_schema}`);
          });
        } else {
          console.log('brand_concepts table not found in any schema');
        }
      } catch (findErr) {
        console.error('Error finding brand_concepts table:', findErr.message);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    await pool.end();
  }
}

testDirectPgConnection();