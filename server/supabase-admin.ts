import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase Admin client with service role key
// This has admin privileges and should only be used on the server
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    )
  : null;

/**
 * Create a new user in Supabase Auth
 */
export async function createUser(email: string, password?: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm the email so the user can log in immediately
  });
  
  if (error) {
    throw error;
  }
  
  return data.user;
}

/**
 * Update an existing user in Supabase Auth
 */
export async function updateUser(id: string, updates: {
  email?: string;
  password?: string;
  user_metadata?: Record<string, any>;
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    id,
    updates
  );
  
  if (error) {
    throw error;
  }
  
  return data.user;
}

/**
 * Link anonymous user data to a registered user
 * This is useful when a demo user saves their account
 */
export async function linkAnonymousUser(anonymousId: string, email: string, password?: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  
  try {
    // First, create the user with the provided email
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        converted_from_anonymous: true,
        original_anonymous_id: anonymousId
      }
    });
    
    if (error) {
      throw error;
    }
    
    return data.user;
  } catch (error: any) {
    // If the user already exists, try to update them instead
    if (error.message?.includes('already exists')) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users.users.find(u => u.email === email);
      
      if (existingUser) {
        // Update the existing user's metadata
        const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              ...existingUser.user_metadata,
              converted_from_anonymous: true,
              original_anonymous_id: anonymousId
            }
          }
        );
        
        if (updateError) {
          throw updateError;
        }
        
        return data.user;
      }
    }
    
    throw error;
  }
}

/**
 * Generate a password reset link for a user
 */
export async function generatePasswordResetLink(email: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Generate a magic link for a user
 */
export async function generateMagicLink(email: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Delete a user from Supabase Auth
 */
export async function deleteUser(id: string) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  
  if (error) {
    throw error;
  }
  
  return true;
}