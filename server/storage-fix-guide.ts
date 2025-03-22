/**
 * This file contains guidance for fixing Supabase Storage RLS (Row-Level Security) issues.
 * The error "new row violates row-level security policy" indicates missing or incorrect
 * permissions in your Supabase project.
 */

import { supabase } from './storage-utils';

export async function generateStorageSetupInstructions() {
  let instructions = `
# Supabase Storage Setup Guide

## Current Issue
We detected a Row-Level Security (RLS) policy violation when trying to upload files to your Supabase storage.
Error message: "new row violates row-level security policy"

## How to Fix This

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Navigate to your project
3. In the left sidebar, click on "Storage"
4. Check if the "assets" bucket exists:
   - If not, click "New Bucket"
   - Name it "assets"
   - Select "Public" bucket type
   - Click "Create bucket"

5. Set up proper RLS policies:
   - Click on the "assets" bucket
   - Go to the "Policies" tab
   - You need the following policies:

### For SELECT (reading files)
- Click "New Policy"
- Policy name: "Public SELECT access"
- Allowed operation: SELECT
- Policy definition: Choose "Custom"
- Policy: \`true\` (to allow anyone to read files)
- Click "Save"

### For INSERT (uploading files)
- Click "New Policy"
- Policy name: "Authenticated INSERT access"
- Allowed operation: INSERT
- Policy definition: Choose "Custom"
- Policy: \`auth.role() = 'authenticated' OR auth.role() = 'service_role'\`
- Click "Save"

### For UPDATE (updating files)
- Click "New Policy"
- Policy name: "Authenticated UPDATE access"
- Allowed operation: UPDATE
- Policy definition: Choose "Custom" 
- Policy: \`auth.role() = 'authenticated' OR auth.role() = 'service_role'\`
- Click "Save"

### For DELETE (deleting files)
- Click "New Policy"
- Policy name: "Authenticated DELETE access"
- Allowed operation: DELETE
- Policy definition: Choose "Custom"
- Policy: \`auth.role() = 'authenticated' OR auth.role() = 'service_role'\`
- Click "Save"

## Alternative: Quick Setup Template
- Click "New Policy" 
- Select "Use a template" button
- Choose "Give users access to their own folder"
- This will create a policy that allows authenticated users to access only folders that match their user ID

## Testing the Fix
After setting up the policies, try these tests:
1. Generate a new logo in the app
2. Check if it's stored in the Supabase storage
3. Verify the URL is correctly updated

## Additional Notes
- Remember that Supabase RLS policies are enforced server-side
- The anon key used in this application has limited permissions by design
- For production, consider more granular permissions based on user ownership
`;

  // Try to get bucket info to enhance instructions
  let bucketInfo = null;
  if (supabase) {
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (!bucketError && buckets) {
        instructions += "\n\n## Current Bucket Status\n";
        if (buckets.length === 0) {
          instructions += "- No storage buckets exist in your Supabase project\n";
        } else {
          instructions += `- Found ${buckets.length} storage buckets:\n`;
          for (const bucket of buckets) {
            instructions += `  - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})\n`;
          }
        }
        
        // Check if assets bucket exists and get policies
        const assetsBucket = buckets.find(b => b.name === 'assets');
        if (assetsBucket) {
          instructions += "- The 'assets' bucket already exists, so we need to add/modify policies\n";
        }
      }
    } catch (e) {
      console.error("Error getting bucket info:", e);
    }
  }

  return instructions;
}

export async function printStorageFixGuide() {
  const guide = await generateStorageSetupInstructions();
  console.log(guide);
  return guide;
}

// If this script is run directly via Node
if (require.main === module) {
  printStorageFixGuide().catch(console.error);
}