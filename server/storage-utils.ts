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
    console.log('Attempting to initialize Supabase storage bucket...');
    
    // Direct approach to create bucket - if it exists, it will return a specific error
    // that we can handle
    const { error: createError } = await supabase
      .storage
      .createBucket(STORAGE_BUCKET, {
        public: true, // Make the bucket public
        fileSizeLimit: 5242880, // 5MB
      });
    
    if (createError) {
      // This error may indicate the bucket already exists (which is fine)
      // or there's a permission issue (which we need to handle)
      const errorMessage = createError.message || '';
      
      // Check for common error messages
      if (errorMessage.includes('already exists') || 
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('violation of policy')) {
        console.log(`Storage bucket '${STORAGE_BUCKET}' already exists or you don't have permission to create it.`);
        
        // Verify we can at least access the bucket
        try {
          // Try to list files to confirm access
          const { data: files, error: listError } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .list();
          
          if (listError) {
            console.warn(`Can't list files in bucket: ${listError.message}`);
          } else {
            console.log(`Successfully accessed bucket '${STORAGE_BUCKET}'. Found ${files?.length || 0} files.`);
          }
        } catch (accessError) {
          console.warn(`Error accessing bucket: ${accessError}`);
        }
        
        return true; // Continue even with errors - we might have read/write access
      }
      
      // Log actual error details for debugging
      console.error('Error creating bucket:', {
        message: createError.message,
        // Safely access potential properties that might not exist in all StorageError objects
        details: (createError as any).details,
        hint: (createError as any).hint
      });
      
      // Return true to allow the app to work with Replicate URLs
      return true;
    }
    
    console.log(`Storage bucket '${STORAGE_BUCKET}' created successfully.`);
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
        
        // Check for specific error messages
        if (
          errorMessage.includes('permission') || 
          errorMessage.includes('policy') || 
          errorMessage.includes('not authorized')
        ) {
          console.log('Permission denied when uploading to Supabase storage:', errorMessage);
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