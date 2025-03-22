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
      console.error('Error listing buckets:', bucketsError);
      return false;
    }

    // Check if our bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabase
        .storage
        .createBucket(STORAGE_BUCKET, {
          public: true, // Make the bucket public
          fileSizeLimit: 5242880, // 5MB
        });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }
      
      console.log(`Storage bucket '${STORAGE_BUCKET}' created successfully.`);
    } else {
      console.log(`Storage bucket '${STORAGE_BUCKET}' already exists.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage bucket:', error);
    return false;
  }
}

/**
 * Upload an image from a URL to Supabase storage
 * @param imageUrl The URL of the image to upload
 * @returns The URL of the uploaded image in Supabase storage
 */
export async function uploadImageFromUrl(imageUrl: string): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase client not initialized. Check your environment variables.');
    return null;
  }

  try {
    // Initialize bucket if needed
    await initializeStorageBucket();
    
    // Fetch the image from the URL
    console.log(`Fetching image from URL: ${imageUrl}`);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    // Get the image data as a buffer
    const imageData = await response.buffer();
    
    // Generate a unique file name
    const fileName = `logo-${uuidv4()}.png`;
    
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
      console.error('Error uploading image to Supabase storage:', error);
      return null;
    }
    
    // Get the public URL for the uploaded image
    const { data: publicUrlData } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);
    
    console.log(`Image uploaded to Supabase storage: ${publicUrlData.publicUrl}`);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image from URL:', error);
    return null;
  }
}