/**
 * This is a utility script to check and verify the database connection string.
 * It ensures that DATABASE_URL is set properly.
 */

import 'dotenv/config';

console.log('🔍 Checking database connection environment variable...\n');

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
  console.log('   The application will not be able to connect to the database.');
  process.exit(1);
}

// Check for SSL parameters which are essential for secure connections
if (databaseUrl.includes('sslmode=')) {
  console.log('\n✅ Connection string includes SSL mode parameter.');
} else {
  console.log('\n⚠️ Connection string does not explicitly specify SSL mode.');
  console.log('   Secure connections typically require SSL. The application');
  console.log('   is configured to accept self-signed certificates.');
}

console.log('\nRecommendation:');
console.log('1. Ensure DATABASE_URL contains a properly formatted pooled connection string');
console.log('2. The connection string should include the SSL mode parameter for secure connections');
console.log('3. The application uses DATABASE_URL to connect to the database');