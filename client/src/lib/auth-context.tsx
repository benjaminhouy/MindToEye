import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { apiRequest, queryClient } from './queryClient';

// Define the shape of our auth context
type AuthContextType = {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Provider component that wraps the app and makes auth available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register user with our API after Supabase auth
  const registerUserWithApi = async (authUser: User) => {
    try {
      console.log("Registering user with API:", authUser.email);
      
      const response = await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          email: authUser.email,
          authId: authUser.id,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log("API registration response:", data);
      return data;
    } catch (error) {
      console.error("Error registering user with API:", error);
      throw error;
    }
  };

  // Handle authentication state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        
        // Register with our API
        try {
          await registerUserWithApi(session.user);
        } catch (err) {
          console.error("Failed to register user with API during initial session:", err);
          // Continue anyway - don't block the user experience
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        
        if (session?.user) {
          setUser(session.user);
          
          // Register with our API on sign in or sign up
          try {
            await registerUserWithApi(session.user);
          } catch (err) {
            console.error("Failed to register user with API on auth change:", err);
            // Continue anyway
          }
        } else {
          setUser(null);
          console.log("No authenticated user detected, clearing query cache");
          // Clear the query cache when no user is authenticated
          queryClient.clear();
        }
        
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Auth context: Starting sign in process");
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log("Auth response:", { data, error });
      
      if (error) {
        console.error("Auth error:", error.message);
        setError(error.message);
        return Promise.reject(error);
      } else if (data?.user && data?.session) {
        console.log("Sign in successful, updating user context");
        // Immediately update user and session on successful login
        setSession(data.session);
        setUser(data.user);
        return Promise.resolve();
      } else {
        console.error("No user or session in response");
        setError('Failed to sign in: No user data received');
        return Promise.reject(new Error('No user data received'));
      }
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      setError('An unexpected error occurred');
      return Promise.reject(error);
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
      } else if (data?.user) {
        if (data.user.identities?.length === 0) {
          setError('This email is already registered. Please try logging in instead.');
        } else if (data.session) {
          // Auto-login if no email confirmation required
          setSession(data.session);
          setUser(data.user);
        } else {
          // Need email verification
          setError('Please check your email for the confirmation link');
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log("Auth context: Starting sign out process");
      setLoading(true);
      setError(null);
      
      // Reset query cache to ensure projects from previous user are not displayed
      queryClient.clear();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error.message);
        setError(error.message);
      } else {
        console.log("Sign out successful, clearing user context");
        // Explicitly clear the user and session state
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Provide the auth context value
  const value = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}