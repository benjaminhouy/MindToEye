import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client with additional options for better reliability
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,  // Don't persist the session to avoid token expiry issues
        autoRefreshToken: false // Disable auto refresh to avoid related errors
      },
      global: {
        headers: {
          'X-Client-Info': 'mindtoeye-server',  // Helps with debugging
        },
      },
      // Disable SSL check for development environments
      db: {
        schema: 'public'
      }
    })
  : null;

// Log Supabase connection status
if (supabase) {
  console.log(`Supabase client initialized with URL: ${supabaseUrl?.substring(0, 15)}...`);
} else {
  console.warn('Supabase client could not be initialized - check SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Bucket name for storing images (using lowercase as Supabase recommended practice)
const STORAGE_BUCKET = 'logos';

/**
 * Initialize the storage bucket if it doesn't exist
 */
export async function initializeStorageBucket() {
  if (!supabase) {
    console.error('Supabase client not initialized. Check your environment variables.');
    return false;
  }

  try {
    console.log('Checking if Supabase storage is accessible...');
    
    // First check if we can list storage buckets
    try {
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();
      
      if (bucketsError) {
        console.warn('Unable to list storage buckets:', bucketsError.message);
      } else {
        console.log(`Found ${buckets.length} storage buckets.`);
        
        // Check if our bucket already exists
        const existingBucket = buckets.find(bucket => bucket.name === STORAGE_BUCKET);
        if (existingBucket) {
          console.log(`Storage bucket '${STORAGE_BUCKET}' already exists.`);
          // Try to access the bucket to confirm we have permissions
          const { data: files, error: listError } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .list();
            
          if (!listError) {
            console.log(`Successfully accessed bucket '${STORAGE_BUCKET}'. Found ${files?.length || 0} files.`);
            return true;
          } else {
            console.warn(`Bucket exists but can't list files. Error: ${listError.message}`);
          }
        }
      }
    } catch (listError) {
      console.warn('Error listing storage buckets:', listError);
    }
    
    // We need to create a new bucket
    console.log(`Creating new storage bucket: '${STORAGE_BUCKET}'...`);
    
    try {
      // Try to create the bucket - this is where we might hit RLS policy issues
      const { error: createError } = await supabase
        .storage
        .createBucket(STORAGE_BUCKET, {
          public: true, // Make it public
          fileSizeLimit: 10485760, // 10MB limit for files
        });
      
      if (createError) {
        const errorMessage = createError.message || '';
        
        if (errorMessage.includes('already exists') || 
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('violation of policy')) {
          
          console.log(`Policy violation when creating bucket '${STORAGE_BUCKET}'. This is usually due to RLS policies.`);
          console.log(`Trying to access the bucket directly...`);
          
          // Try to access the bucket directly instead
          try {
            const { data: files, error: accessError } = await supabase
              .storage
              .from(STORAGE_BUCKET)
              .list();
            
            if (accessError) {
              // If we can't list files, try a dummy upload to see if we have write access
              console.log(`Can't list files from bucket. Trying a test upload...`);
              
              // Create a small test file (1x1 transparent pixel as a PNG)
              const testPngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
              const testFileName = `test-${Date.now()}.png`;
              
              const { error: uploadError } = await supabase
                .storage
                .from(STORAGE_BUCKET)
                .upload(testFileName, testPngData, {
                  contentType: 'image/png',
                  upsert: true
                });
              
              if (uploadError) {
                console.warn(`Test upload failed: ${uploadError.message}`);
                console.log('Will use Replicate URLs as fallback.');
                return true;
              } else {
                console.log('Test upload succeeded - we have write access to the bucket!');
                return true;
              }
            } else {
              console.log(`Successfully listed files from bucket '${STORAGE_BUCKET}'. Found ${files?.length || 0} files.`);
              return true;
            }
          } catch (accessAttemptError) {
            console.warn(`Error accessing bucket directly:`, accessAttemptError);
            console.log('Will use Replicate URLs as fallback.');
          }
        } else {
          // Some other error occurred
          console.error('Error creating bucket:', {
            message: createError.message,
            details: (createError as any).details,
            hint: (createError as any).hint
          });
        }
      } else {
        // Successfully created the bucket
        console.log(`Storage bucket '${STORAGE_BUCKET}' created successfully.`);
        
        // Set public access policy for the bucket
        try {
          // Update the bucket to be public
          const { error: updateError } = await supabase
            .storage
            .updateBucket(STORAGE_BUCKET, {
              public: true
            });
          
          if (updateError) {
            console.warn(`Could not set bucket to public: ${updateError.message}`);
          } else {
            console.log(`Set bucket '${STORAGE_BUCKET}' to public successfully.`);
          }
        } catch (updateError) {
          console.warn('Error updating bucket visibility:', updateError);
        }
        
        return true;
      }
    } catch (createError) {
      console.error('Error creating bucket:', createError);
    }
    
    // If we get here, we've hit issues but should still continue
    console.log('Will use Replicate URLs as fallback due to storage permission issues.');
    return true;
  } catch (error) {
    // Log the full error for debugging
    console.error('Unexpected error initializing storage bucket:', error);
    // Continue even if there's an error initializing storage
    return true;
  }
}

/**
 * Upload an image from a URL to Supabase storage
 * @param imageUrl The URL of the image to upload
 * @returns The URL of the uploaded image in Supabase storage or null if upload fails
 */
export async function uploadImageFromUrl(imageUrl: string): Promise<string | null> {
  if (!supabase) {
    console.log('Supabase client not initialized. Using Replicate URL directly.');
    return null;
  }

  try {
    // Initialize bucket if needed
    const bucketInitialized = await initializeStorageBucket();
    if (!bucketInitialized) {
      console.log('Bucket initialization failed. Using Replicate URL directly.');
      return null;
    }
    
    // Fetch the image from the URL
    console.log(`Fetching image from URL: ${imageUrl}`);
    let response;
    try {
      response = await fetch(imageUrl);
      
      if (!response.ok) {
        console.log(`Failed to fetch image: ${response.statusText}. Using Replicate URL directly.`);
        return null;
      }
    } catch (fetchError) {
      console.log('Error fetching image from URL:', fetchError);
      return null;
    }
    
    // Get the image data as a buffer
    let imageData;
    try {
      imageData = await response.buffer();
    } catch (bufferError) {
      console.log('Error buffering image data:', bufferError);
      return null;
    }
    
    // Generate a unique file name with timestamp to avoid conflicts
    const timestamp = new Date().getTime();
    const fileName = `logo-${timestamp}-${uuidv4().substring(0, 8)}.png`;
    
    // Upload the image to Supabase storage
    console.log(`Attempting to upload image to Supabase storage bucket '${STORAGE_BUCKET}' as '${fileName}'...`);
    let uploadResult;
    try {
      // First try direct upload
      uploadResult = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(fileName, imageData, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true // Use true to overwrite if needed
        });
      
      if (uploadResult.error) {
        const errorMessage = uploadResult.error.message || '';
        
        // Special handling for "bucket not found" error
        if (errorMessage.includes('Bucket not found')) {
          console.log('Bucket not found. Using Replicate URL directly.');
          
          // Log the problem for debugging
          console.log(`
          ======== IMPORTANT STORAGE CONFIGURATION NOTE ========
          Your Supabase project doesn't have the '${STORAGE_BUCKET}' bucket configured.
          
          To fix this:
          1. Go to your Supabase dashboard at ${supabaseUrl?.replace('https://', 'https://app.supabase.com/project/')}
          2. Navigate to Storage → Buckets
          3. Click "New Bucket" and create one named "${STORAGE_BUCKET}"
          4. Set it to "Public" bucket
          5. Create the following policies for the bucket:
             - SELECT policy: Allow public access (true)
             - INSERT policy: Allow authenticated users or service role (true)
          =========================================================
          `);
          
          return null;
        }
        
        // Other permission issues
        if (
          errorMessage.includes('permission') || 
          errorMessage.includes('policy') || 
          errorMessage.includes('not authorized') ||
          errorMessage.includes('violates')
        ) {
          console.log('Permission denied when uploading to Supabase storage:', errorMessage);
          
          // Log helpful instructions
          console.log(`
          ======== STORAGE PERMISSION ERROR ========
          Your Supabase storage has permission restrictions.
          
          To fix this:
          1. Go to your Supabase dashboard
          2. Navigate to Storage → Policies
          3. Find the "${STORAGE_BUCKET}" bucket
          4. Add a new INSERT policy with condition: "true"
          5. This will allow any authenticated user to upload files
          =========================================
          `);
          
          return null;
        }
        
        console.log('Error uploading to Supabase storage:', {
          message: errorMessage,
          details: (uploadResult.error as any).details
        });
        return null;
      }
      
      // Successfully uploaded
      console.log('Successfully uploaded image to Supabase storage');
    } catch (uploadError) {
      console.log('Exception during Supabase storage upload:', uploadError);
      return null;
    }
    
    // If we've made it this far, we should have a successful upload
    // Now get the public URL
    try {
      const { data: publicUrlData } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);
      
      if (publicUrlData && publicUrlData.publicUrl) {
        console.log(`Image successfully stored in Supabase: ${publicUrlData.publicUrl}`);
        return publicUrlData.publicUrl;
      } else {
        console.log('Could not generate public URL for uploaded file');
        return null;
      }
    } catch (urlError) {
      console.log('Error generating public URL:', urlError);
      return null;
    }
  } catch (error) {
    console.log('Unexpected error in uploadImageFromUrl:', error);
    return null;
  }
}