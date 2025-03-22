/**
 * This file provides utilities to check if the Supabase storage policies are correctly set up.
 */

import { supabase } from './storage-utils';

/**
 * Test if Supabase storage is properly configured with the right policies
 */
export async function checkStoragePolicies() {
  if (!supabase) {
    return {
      success: false,
      message: "Supabase client not initialized",
      details: "The Supabase client has not been initialized. Check your environment variables."
    };
  }

  console.log("Checking Supabase storage policies...");
  
  try {
    // Step 1: Check if the assets bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return {
        success: false,
        message: "Error listing storage buckets",
        error: bucketsError.message,
        details: "Make sure your Supabase URL and key are correct and have storage permissions."
      };
    }
    
    // Look for the 'assets' bucket
    const assetsBucket = buckets.find(b => b.name === 'assets');
    if (!assetsBucket) {
      return {
        success: false,
        message: "Assets bucket not found",
        buckets: buckets.map(b => b.name),
        details: "The 'assets' bucket does not exist. Create it with public access."
      };
    }
    
    // Step 2: Check if the bucket is public
    if (!assetsBucket.public) {
      return {
        success: false,
        message: "Assets bucket is not public",
        details: "Update the 'assets' bucket to be public for proper file access."
      };
    }
    
    // Step 3: Test if we can upload a file
    const testContent = Buffer.from('Storage policy test - ' + new Date().toISOString());
    const testPath = `policy-test/test-${Date.now()}.txt`;
    
    console.log(`Testing file upload to ${testPath}...`);
    
    const { error: uploadError } = await supabase
      .storage
      .from('assets')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      return {
        success: false,
        message: "Upload test failed",
        error: uploadError.message,
        policyStatus: "INSERT policy is missing or incorrect",
        details: "Add an INSERT policy with condition: auth.role() = 'authenticated' OR auth.role() = 'service_role'"
      };
    }
    
    // Step 4: Test if we can list files
    const { data: files, error: listError } = await supabase
      .storage
      .from('assets')
      .list('policy-test');
    
    if (listError) {
      return {
        success: false,
        message: "Failed to list files",
        error: listError.message,
        policyStatus: "SELECT policy is missing or incorrect",
        details: "Add a SELECT policy with condition: true"
      };
    }
    
    // Step 5: Get a public URL for the file
    const { data: publicUrlData } = supabase
      .storage
      .from('assets')
      .getPublicUrl(testPath);
    
    // Step 6: Try to delete the test file
    const { error: deleteError } = await supabase
      .storage
      .from('assets')
      .remove([testPath]);
    
    return {
      success: true,
      message: "Storage policies are correctly configured",
      tests: {
        bucketExists: true,
        bucketPublic: assetsBucket.public,
        uploadTest: !uploadError,
        listFilesTest: !listError,
        deleteTest: !deleteError,
        publicUrl: publicUrlData.publicUrl
      },
      details: "Your Supabase storage is properly configured with the required RLS policies."
    };
  } catch (error) {
    console.error("Error checking storage policies:", error);
    return {
      success: false,
      message: "Failed to check storage policies",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run this file directly using tsx
export async function runAsScript() {
  console.log("Checking Supabase storage policies...");
  const result = await checkStoragePolicies();
  console.log(JSON.stringify(result, null, 2));
  return result;
}