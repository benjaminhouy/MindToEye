import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useToast } from '@/hooks/use-toast';

// Define the context type
type AuthContextType = {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  startDemoSession: () => Promise<void>;
  saveDemoAccount: (email: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  isDemo: boolean;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for accessing the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const { toast } = useToast();

  // Register a new user with our own API
  const registerUserWithApi = async (authUser: User) => {
    try {
      // Register the user with our own API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'x-auth-id': authUser.id
        },
        body: JSON.stringify({
          authId: authUser.id,
          username: authUser.email || `user-${authUser.id.substring(0, 8)}`,
          email: authUser.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API registration error:', errorData);
        throw new Error(errorData.error || 'Failed to register with API');
      }

      return await response.json();
    } catch (error) {
      console.error('Error registering user with API:', error);
      throw error;
    }
  };

  // Effect to set up the auth state listener
  useEffect(() => {
    async function getInitialSession() {
      try {
        setLoading(true);
        
        // Get the initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        
        if (initialSession?.user) {
          setUser(initialSession.user);
          
          // Check if this is a demo user
          const isAnonymous = initialSession.user.app_metadata.provider === 'anonymous';
          const isConverted = initialSession.user.user_metadata.converted === true;
          setIsDemo(isAnonymous && !isConverted);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    }

    // Set up auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle demo detection on auth state change
        if (session?.user) {
          const isAnonymous = session.user.app_metadata.provider === 'anonymous';
          const isConverted = session.user.user_metadata.converted === true;
          setIsDemo(isAnonymous && !isConverted);
          
          // If this is a new user, register them with our API
          if (event === 'SIGNED_IN') {
            try {
              await registerUserWithApi(session.user);
            } catch (error) {
              console.error('Error during API registration:', error);
              // Don't treat this as a fatal error, user might already be registered
            }
          }
        }
      }
    );

    // Get the initial session
    getInitialSession();

    // Clean up the subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // First try our custom authentication endpoint for converted accounts
      try {
        const response = await fetch('/api/login-with-email-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Set user and session from our server response
          setUser(result.user);
          setSession({
            access_token: `local-auth-${result.user.id}`, // Simplified token
            refresh_token: '',
            expires_in: 86400,
            expires_at: new Date().getTime() + 86400 * 1000,
            user: result.user
          });
          
          // Success message
          toast({
            title: "Signed in successfully",
            description: "Welcome back!",
          });
          
          // Successfully logged in with our custom endpoint
          return;
        }
        
        // If response wasn't ok, continue to Supabase auth
        console.log("Custom auth failed, falling back to Supabase:", await response.text());
      } catch (err) {
        // If our endpoint fails, continue to try Supabase auth
        console.log("Error in custom auth, falling back to Supabase:", err);
      }
      
      // Fall back to Supabase auth for regular accounts
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      // Success message
      toast({
        title: "Signed in successfully",
        description: "Welcome back!",
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
      
      toast({
        title: "Sign in failed",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        throw error;
      }

      // Success message
      toast({
        title: "Account created successfully",
        description: "Check your email to confirm your account.",
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message || 'Failed to sign up');
      
      toast({
        title: "Sign up failed",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear any local state
      setSession(null);
      setUser(null);
      setIsDemo(false);
      
      // Success message
      toast({
        title: "Signed out successfully",
        description: "You have been signed out.",
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
      
      toast({
        title: "Sign out failed",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Start a demo session with anonymous authentication
  const startDemoSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First sign in anonymously with Supabase
      console.log("Starting demo session");
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError || !authData.session) {
        throw new Error(authError?.message || 'Failed to start anonymous session');
      }
      
      console.log("Anonymous session created, registering with server");
      
      // Now register this anonymous user with our server
      const response = await fetch('/api/register-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register anonymous user');
      }
      
      // Get user data from our API
      const userData = await response.json();
      
      // Set demo flag
      setIsDemo(true);
      
      // Success message
      toast({
        title: "Demo session started",
        description: "You can now explore the platform. Save your work to create an account.",
      });
    } catch (error: any) {
      console.error('Demo session error:', error);
      setError(error.message || 'Failed to start demo session');
      
      toast({
        title: "Failed to start demo",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save a demo account with email (step 1 of 2 in conversion)
  const saveDemoAccount = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!session?.access_token || !user?.id) {
        throw new Error('No active session');
      }
      
      // Call our API to save the demo account
      const response = await fetch('/api/save-demo-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-auth-id': user.id
        },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save demo account');
      }
      
      // Get the response data
      const updatedUser = await response.json();
      
      // Update our state to reflect that this is no longer a demo user
      setIsDemo(false);
      
      // Update the user metadata on the Supabase side
      await supabase.auth.updateUser({
        data: { 
          email,
          converted: true
        }
      });
      
      // Flag in sessionStorage that we need to prompt for password
      sessionStorage.setItem('pendingPasswordSetup', 'true');
      sessionStorage.setItem('savedEmail', email);
      
      // Success message
      toast({
        title: "Account saved successfully",
        description: "Your work has been saved. Set a password to secure your account.",
      });
      
      return updatedUser;
    } catch (error: any) {
      console.error('Save demo account error:', error);
      setError(error.message || 'Failed to save account');
      
      toast({
        title: "Failed to save account",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Set password for a previously saved demo account (step 2 of 2 in conversion)
  const setPassword = async (password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!session?.access_token || !user?.id) {
        throw new Error('No active session');
      }
      
      // Call our API to set the password
      const response = await fetch('/api/set-account-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-auth-id': user.id
        },
        body: JSON.stringify({ password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set password');
      }
      
      // Get the response data
      const result = await response.json();
      
      // Clear the pending password setup flag
      sessionStorage.removeItem('pendingPasswordSetup');
      
      // Success message
      toast({
        title: "Password set successfully",
        description: "Your account is now secure. You can log in with your email and password anytime.",
      });
      
      return result;
    } catch (error: any) {
      console.error('Set password error:', error);
      setError(error.message || 'Failed to set password');
      
      toast({
        title: "Failed to set password",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    startDemoSession,
    saveDemoAccount,
    setPassword,
    loading,
    error,
    isDemo
  };

  // Provide the context to children
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}