// Test script to diagnose Supabase storage upload issues
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const authToken = process.argv[2]; // Get JWT token from command line argument

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Create a client with JWT token if provided
const createClientWithToken = (token) => {
  if (!token) return supabase;
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

async function testStorageUpload() {
  console.log('Testing Supabase storage upload with the following configuration:');
  console.log(`- Supabase URL: ${supabaseUrl.substring(0, 20)}...`);
  console.log(`- JWT Token provided: ${authToken ? 'Yes' : 'No'}`);

  // First, check if we can list buckets
  try {
    console.log('\n1. Listing storage buckets:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Failed to list buckets:', bucketsError.message);
      return;
    }
    
    console.log(`Found ${buckets.length} buckets:`, buckets.map(b => b.name).join(', '));
    
    // Check if assets bucket exists
    const assetsBucket = buckets.find(b => b.name === 'assets');
    if (!assetsBucket) {
      console.error('The "assets" bucket does not exist. Please create it in the Supabase dashboard.');
      return;
    }

    // Try to list files in the assets bucket
    console.log('\n2. Listing files in assets bucket:');
    const { data: files, error: listError } = await supabase.storage.from('assets').list();
    
    if (listError) {
      console.error('Failed to list files:', listError.message);
    } else {
      console.log(`Found ${files.length} files/folders at root level`);
    }

    // Attempt to upload a test file using anonymous key
    console.log('\n3. Attempting upload with anonymous key:');
    const testData = Buffer.from('Test file content - ' + new Date().toISOString());
    const testPath = `test-upload-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('assets')
      .upload(testPath, testData, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Upload failed with anonymous key:', uploadError.message);
      console.log('Error details:', JSON.stringify(uploadError, null, 2));
    } else {
      console.log('Upload succeeded with anonymous key. Path:', uploadData.path);
    }

    // If we have a JWT token, try with that as well
    if (authToken) {
      console.log('\n4. Attempting upload with JWT token:');
      const authClient = createClientWithToken(authToken);
      
      const testAuthData = Buffer.from('JWT Auth test - ' + new Date().toISOString());
      const testAuthPath = `auth-test-${Date.now()}.txt`;
      
      const { data: authUploadData, error: authUploadError } = await authClient
        .storage
        .from('assets')
        .upload(testAuthPath, testAuthData, {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (authUploadError) {
        console.error('Upload failed with JWT token:', authUploadError.message);
        console.log('Error details:', JSON.stringify(authUploadError, null, 2));
        
        // Provide detailed guidance on how to fix RLS policies
        if (authUploadError.message.includes('row-level security policy')) {
          console.log('\n======== STORAGE PERMISSION ERROR ========');
          console.log('Your Supabase storage has RLS (Row-Level Security) policies that are preventing uploads.');
          console.log('To fix this issue:');
          console.log('1. Go to your Supabase dashboard');
          console.log('2. Navigate to Storage → Policies');
          console.log('3. Find the "assets" bucket');
          console.log('4. Add a new INSERT policy with condition: "auth.role() = \'authenticated\'", or for testing just use "true"');
          console.log('5. For better security, you can set more specific conditions like: "(auth.uid() = storage.foldername)::text" to only allow users to upload to folders matching their user ID');
          console.log('========================================');
        }
      } else {
        console.log('Upload succeeded with JWT token. Path:', authUploadData.path);
      }
      
      // Try to upload to a user-specific folder
      console.log('\n5. Attempting upload to user-specific folder with JWT token:');
      
      // Extract user ID from auth token (for demo, use a fixed string)
      const userId = 'test-user-folder';
      const userFolderPath = `${userId}/test-file-${Date.now()}.txt`;
      
      const { data: userFolderData, error: userFolderError } = await authClient
        .storage
        .from('assets')
        .upload(userFolderPath, Buffer.from('User folder test'), {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (userFolderError) {
        console.error('Upload to user folder failed:', userFolderError.message);
      } else {
        console.log('Upload to user folder succeeded. Path:', userFolderData.path);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testStorageUpload();