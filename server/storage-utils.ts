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

// Bucket name for storing assets (using lowercase as Supabase recommended practice)
const STORAGE_BUCKET = 'assets';

// For demo purposes, we'll use a consistent user ID (this would normally come from auth)
// In a real app, this would be the authenticated user's ID
const DEMO_USER_ID = 'demo-user';

// Public folder for assets that should be accessible by all users
const PUBLIC_FOLDER = 'public';

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
    const randomId = uuidv4().substring(0, 8);
    
    // Create a path that includes the user ID for isolation
    // This matches the structure expected by the RLS policies
    // For public files, use the public folder instead
    const usePublicFolder = false; // Set to true for files that should be public to all users
    const userId = usePublicFolder ? PUBLIC_FOLDER : DEMO_USER_ID;
    
    // Use the same hierarchical structure as in uploadLogoFromUrl
    const filePath = `${userId}/images/logo-${timestamp}-${randomId}.png`;
    
    // Upload the image to Supabase storage
    console.log(`Attempting to upload image to Supabase storage bucket '${STORAGE_BUCKET}' as '${filePath}'...`);
    let uploadResult;
    try {
      // First try direct upload
      uploadResult = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(filePath, imageData, {
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
        .getPublicUrl(filePath);
      
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

/**
 * Upload a logo image from a URL to Supabase storage in the logos folder
 * @param imageUrl The URL of the logo image to upload
 * @param projectId The project ID to associate with this logo
 * @param conceptId The concept ID to associate with this logo
 * @param fileType The file type/extension of the logo (default: svg)
 * @param authId The authenticated user's ID from Supabase (optional, falls back to demo user)
 * @returns The URL of the uploaded logo in Supabase storage or null if upload fails
 */
export async function uploadLogoFromUrl(
  imageUrl: string,
  projectId: number,
  conceptId: number,
  fileType: string = 'svg',
  authId?: string
): Promise<string | null> {
  if (!supabase) {
    console.log('Supabase client not initialized. Using Replicate URL directly.');
    return imageUrl; // Return original URL as fallback
  }

  try {
    // Initialize bucket if needed
    const bucketInitialized = await initializeStorageBucket();
    if (!bucketInitialized) {
      console.log('Bucket initialization failed. Using Replicate URL directly.');
      return imageUrl; // Return original URL as fallback
    }
    
    // Fetch the image from the URL
    console.log(`Fetching logo from URL: ${imageUrl}`);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.log(`Failed to fetch logo image: ${response.statusText}. Using Replicate URL directly.`);
      return imageUrl; // Return original URL as fallback
    }
    
    // Get the image data as a buffer/arrayBuffer
    let imageData: Buffer;
    try {
      // For Node.js environment
      imageData = await response.buffer();
    } catch (bufferError) {
      try {
        // For browser or other environments
        const arrayBuffer = await response.arrayBuffer();
        imageData = Buffer.from(arrayBuffer);
      } catch (arrayBufferError) {
        console.log('Error obtaining image data:', arrayBufferError);
        return imageUrl; // Return original URL as fallback
      }
    }
    
    // Generate a unique filename with project and concept identifiers
    const timestamp = new Date().getTime();
    const randomId = uuidv4().substring(0, 8);
    
    // Use the provided authId if available, or fall back to demo user
    // The authId is the Supabase user's UUID that will match our storage policy
    const userId = authId || DEMO_USER_ID;
    console.log(`Using user ID for storage path: ${userId}`)
    
    // Improved path structure: userId/projectId/conceptId/logos/logo-timestamp-randomId.fileType
    // This structure provides better isolation, security, and organization
    const filePath = `${userId}/${projectId}/${conceptId}/logos/logo-${timestamp}-${randomId}.${fileType}`;
    
    // Set the appropriate content type based on file type
    let contentType: string;
    switch (fileType.toLowerCase()) {
      case 'svg':
        contentType = 'image/svg+xml';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      default:
        contentType = 'image/svg+xml'; // Default to SVG
    }
    
    // Upload the logo to Supabase storage
    console.log(`Uploading logo to Supabase storage path: ${filePath}`);
    const { error: uploadError } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(filePath, imageData, {
        contentType,
        cacheControl: '31536000', // Cache for 1 year since logos rarely change
        upsert: true // Overwrite if exists
      });
    
    if (uploadError) {
      console.error('Error uploading logo to Supabase storage:', uploadError.message);
      // If we get a policy violation, try with a simpler path
      if (uploadError.message.includes('policy') || uploadError.message.includes('permission')) {
        console.log('Attempting upload with simplified path structure...');
        // For the fallback path, use a flatter structure that's more likely to work with default Supabase policies
        const simplePath = `${userId}/logos/logo-${projectId}-${conceptId}-${timestamp}.${fileType}`;
        
        const { error: retryError } = await supabase
          .storage
          .from(STORAGE_BUCKET)
          .upload(simplePath, imageData, {
            contentType,
            cacheControl: '31536000',
            upsert: true
          });
          
        if (retryError) {
          console.error('Retry upload also failed:', retryError.message);
          return imageUrl; // Return original URL as fallback
        }
        
        // Get URL for the simplified path upload
        const { data: publicUrlData } = supabase
          .storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(simplePath);
          
        if (publicUrlData?.publicUrl) {
          console.log(`Logo successfully stored in Supabase with simplified path: ${publicUrlData.publicUrl}`);
          return publicUrlData.publicUrl;
        }
        
        return imageUrl; // Return original URL as fallback if we couldn't get the public URL
      }
      
      return imageUrl; // Return original URL as fallback
    }
    
    // Get the public URL for the uploaded logo
    const { data: publicUrlData } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);
    
    if (publicUrlData?.publicUrl) {
      console.log(`Logo successfully stored in Supabase: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    } else {
      console.log('Could not generate public URL for uploaded logo. Using Replicate URL as fallback.');
      return imageUrl; // Return original URL as fallback
    }
  } catch (error) {
    console.error('Unexpected error in uploadLogoFromUrl:', error);
    return imageUrl; // Return original URL as fallback
  }
}