import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Bucket name for storing images
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
    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      // Special handling for permission errors - these are common in Replit
      // due to row-level security policies in Supabase
      if (bucketsError.status === 400 || bucketsError.status === 403) {
        console.log('Limited access to Supabase storage API. Using direct URLs or fallback to Replicate.');
        return true; // Return true to allow the application to continue
      }
      
      console.error('Error listing buckets:', bucketsError);
      return false;
    }

    // Check if our bucket exists
    const bucketExists = buckets && buckets.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      try {
        const { error: createError } = await supabase
          .storage
          .createBucket(STORAGE_BUCKET, {
            public: true, // Make the bucket public
            fileSizeLimit: 5242880, // 5MB
          });
        
        if (createError) {
          // If we can't create a bucket due to permissions, log but continue
          if (createError.status === 400 || createError.status === 403) {
            console.log('Unable to create storage bucket due to permission restrictions. Using Replicate URLs directly.');
            return true; // Still return true to allow the application to continue
          }
          
          console.error('Error creating bucket:', createError);
          return false;
        }
        
        console.log(`Storage bucket '${STORAGE_BUCKET}' created successfully.`);
      } catch (bucketError) {
        console.error('Error creating bucket:', bucketError);
        return true; // Still return true to allow the application to continue with Replicate URLs
      }
    } else {
      console.log(`Storage bucket '${STORAGE_BUCKET}' already exists.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage bucket:', error);
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
    
    try {
      // Fetch the image from the URL
      console.log(`Fetching image from URL: ${imageUrl}`);
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        console.log(`Failed to fetch image: ${response.statusText}. Using Replicate URL directly.`);
        return null;
      }
      
      // Get the image data as a buffer
      const imageData = await response.buffer();
      
      // Generate a unique file name
      const fileName = `logo-${uuidv4()}.png`;
      
      try {
        // Upload the image to Supabase storage
        const { data, error } = await supabase
          .storage
          .from(STORAGE_BUCKET)
          .upload(fileName, imageData, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) {
          // If we can't upload due to permissions, log but continue with original URL
          if (error.status === 400 || error.status === 403) {
            console.log('Unable to upload to storage due to permission restrictions. Using Replicate URL directly.');
            return null;
          }
          
          console.log('Error uploading image to Supabase storage:', error);
          return null;
        }
        
        // Get the public URL for the uploaded image
        const { data: publicUrlData } = supabase
          .storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(fileName);
        
        console.log(`Image uploaded to Supabase storage: ${publicUrlData.publicUrl}`);
        
        return publicUrlData.publicUrl;
      } catch (uploadError) {
        console.log('Error during storage upload operation:', uploadError);
        return null;
      }
    } catch (fetchError) {
      console.log('Error fetching image from URL:', fetchError);
      return null;
    }
  } catch (error) {
    console.log('Error in uploadImageFromUrl:', error);
    return null;
  }
}