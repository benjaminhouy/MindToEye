/**
 * This is a utility script to check and verify the database connection strings.
 * It ensures that both SUPABASE_DB_URL and DATABASE_URL are set properly.
 */

import 'dotenv/config';

console.log('🔍 Checking database connection environment variables...\n');

// Check SUPABASE_DB_URL
const supabaseDbUrl = process.env.SUPABASE_DB_URL;
if (supabaseDbUrl) {
  console.log('✅ SUPABASE_DB_URL is set');
  
  // Mask the actual connection string but show structure
  const maskedSupabaseUrl = supabaseDbUrl
    .replace(/postgres:\/\/([^:]+):([^@]+)@/, 'postgres://[USERNAME]:[PASSWORD]@')
    .replace(/\?.*$/, '?[CONNECTION_PARAMS]');
    
  console.log(`   Format: ${maskedSupabaseUrl}`);
} else {
  console.log('❌ SUPABASE_DB_URL is not set');
}

// Check DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  console.log('✅ DATABASE_URL is set');
  
  // Mask the actual connection string but show structure
  const maskedDatabaseUrl = databaseUrl
    .replace(/postgres:\/\/([^:]+):([^@]+)@/, 'postgres://[USERNAME]:[PASSWORD]@')
    .replace(/\?.*$/, '?[CONNECTION_PARAMS]');
    
  console.log(`   Format: ${maskedDatabaseUrl}`);
} else {
  console.log('❌ DATABASE_URL is not set');
}

// Compare the two connection strings
if (supabaseDbUrl && databaseUrl) {
  if (supabaseDbUrl === databaseUrl) {
    console.log('\n✅ Both connection strings are identical. This is the recommended configuration.');
  } else {
    console.log('\n⚠️ WARNING: The connection strings are different:');
    console.log('   Application code uses SUPABASE_DB_URL primarily');
    console.log('   Drizzle ORM tools use DATABASE_URL by convention');
    console.log('   It is recommended to set both to the same value.');
  }
} else if (supabaseDbUrl && !databaseUrl) {
  console.log('\n⚠️ Only SUPABASE_DB_URL is set.');
  console.log('   This works for the application but may cause issues with Drizzle ORM tools.');
  console.log('   Recommendation: Set DATABASE_URL to the same value as SUPABASE_DB_URL.');
} else if (!supabaseDbUrl && databaseUrl) {
  console.log('\n⚠️ Only DATABASE_URL is set.');
  console.log('   The application can fall back to this, but it is recommended to set SUPABASE_DB_URL.');
  console.log('   Recommendation: Set SUPABASE_DB_URL to the same value as DATABASE_URL.');
} else {
  console.log('\n❌ Neither connection string is set. The application will not be able to connect to the database.');
}

// Check for SSL parameters which are essential for Supabase connections
if (supabaseDbUrl || databaseUrl) {
  const connectionString = supabaseDbUrl || databaseUrl;
  if (connectionString.includes('sslmode=')) {
    console.log('\n✅ Connection string includes SSL mode parameter.');
  } else {
    console.log('\n⚠️ Connection string does not explicitly specify SSL mode.');
    console.log('   Supabase connections typically require SSL. The application');
    console.log('   is configured to accept self-signed certificates.');
  }
}

console.log('\nRecommendation:');
console.log('1. Set both SUPABASE_DB_URL and DATABASE_URL to the same pooled connection string');
console.log('2. The connection string should include the SSL mode parameter if connecting to Supabase');
console.log('3. The application will use SUPABASE_DB_URL first, falling back to DATABASE_URL if needed');