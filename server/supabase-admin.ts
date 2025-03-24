import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase Admin client with service role key
// This has admin privileges and should only be used on the server
export const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
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

/**
 * Safely sign out a user and revoke all their sessions
 * This function adds additional validation and error handling for user IDs
 * 
 * @param userIdOrJWT - The user's UUID or JWT token
 * @returns Object with success status and any error message
 */
export async function safelySignOutUser(userIdOrJWT: string): Promise<{
  success: boolean;
  message?: string;
  error?: Error;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      message: 'Supabase admin client not initialized'
    };
  }

  // Skip if empty
  if (!userIdOrJWT || userIdOrJWT.trim() === '') {
    return {
      success: false,
      message: 'No user ID or JWT provided'
    };
  }

  try {
    // Check if this appears to be a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(userIdOrJWT);
    
    // For UUID format, directly use admin.signOut
    if (isUUID) {
      const { error } = await supabaseAdmin.auth.admin.signOut(userIdOrJWT);
      
      if (error) {
        return {
          success: false,
          message: `Error signing out user: ${error.message}`,
          error
        };
      }
      
      return {
        success: true,
        message: `Successfully signed out user: ${userIdOrJWT}`
      };
    } 
    // For what appears to be a JWT token, we need a different approach
    else {
      // For JWT-like strings, get user info first
      try {
        // We won't actually decode the JWT here (that would require the secret)
        // Instead, we'll try to use the getUser method which can accept a JWT
        const { data, error } = await supabaseAdmin.auth.getUser(userIdOrJWT);
        
        if (error || !data.user) {
          return {
            success: false,
            message: `Could not validate JWT: ${error?.message || 'No user found'}`,
            error: error || new Error('No user found with provided JWT')
          };
        }
        
        // Now sign out with the user ID
        const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(data.user.id);
        
        if (signOutError) {
          return {
            success: false,
            message: `Error signing out user: ${signOutError.message}`,
            error: signOutError
          };
        }
        
        return {
          success: true,
          message: `Successfully signed out user: ${data.user.id}`
        };
      } catch (jwtError) {
        return {
          success: false,
          message: `Invalid JWT format: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`,
          error: jwtError instanceof Error ? jwtError : new Error(String(jwtError))
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Unexpected error during sign out: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}