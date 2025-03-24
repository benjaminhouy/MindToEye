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
  resetPassword: (email: string) => Promise<void>;
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
      // Determine if this is an anonymous user
      const isAnonymous = authUser.app_metadata?.provider === 'anonymous';
      
      // Generate a username if email is not available (especially for anonymous users)
      const username = authUser.email || `user-${authUser.id.substring(0, 8)}`;
      
      // For anonymous users, email can be null
      // For registered users, we should have an email
      const email = authUser.email || null;
      
      console.log("Registering user with API, isAnonymous:", isAnonymous, "email:", email, "username:", username);
      
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
          username: username,
          email: email,
          isAnonymous: isAnonymous
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

  // Sign in function - following Supabase best practices
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Sign in attempt with:", email);
      
      // Use Supabase's authentication directly as the primary method
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.warn("Supabase auth failed, trying database auth:", error.message);
        
        // Create a more user-friendly error message for common Supabase errors
        let userFriendlyError = error.message;
        
        if (error.message.includes('Email not confirmed')) {
          userFriendlyError = 'Please verify your email address before logging in';
        } else if (error.message.includes('Invalid login credentials')) {
          userFriendlyError = 'Invalid email or password';
        }
        
        // If Supabase auth fails, try our custom endpoint as a fallback
        // This is mainly for converted demo accounts that might have special handling
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
              access_token: result.session.access_token || `local-auth-${result.user.id}`,
              refresh_token: result.session.refresh_token || '',
              token_type: 'bearer',
              expires_in: 86400,
              expires_at: new Date().getTime() + 86400 * 1000,
              user: result.user
            });
            
            console.log("Sign in completed via custom auth, redirecting user...");
            
            // Success message
            toast({
              title: "Signed in successfully",
              description: "Welcome back!",
            });
            
            return;
          }
          
          // If both authentication methods fail, throw a user-friendly error
          console.error("Both authentication methods failed:", error);
          const errorWithBetterMessage = new Error(userFriendlyError);
          throw errorWithBetterMessage;
        } catch (fallbackError) {
          console.error("Both authentication methods failed:", fallbackError);
          // Throw the user-friendly error instead of the technical one
          const errorWithBetterMessage = new Error(userFriendlyError);
          throw errorWithBetterMessage;
        }
      }
      
      // If we get here, Supabase authentication succeeded
      console.log("Sign in completed, redirecting user...");
      
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

  // Sign out function - following Supabase best practices
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Track the current auth ID for server-side logout
      const currentAuthId = user?.id;
      
      // Clear React Query cache to prevent stale data
      try {
        const { queryClient } = await import('../lib/queryClient');
        if (queryClient) {
          queryClient.clear();
          console.log('Query cache cleared');
        }
      } catch (cacheError) {
        console.warn('Could not clear query cache:', cacheError);
      }
      
      // Clean up any app-specific items
      sessionStorage.removeItem('pendingPasswordSetup');
      sessionStorage.removeItem('savedEmail');
      
      // Call server-side logout to invalidate sessions
      if (currentAuthId) {
        try {
          await fetch('/api/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-id': currentAuthId
            }
          });
          console.log('Server-side session invalidation completed');
        } catch (serverLogoutError) {
          console.warn('Error during server-side logout:', serverLogoutError);
        }
      }
      
      // Use the standard Supabase signOut method - let it handle token clearing
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Supabase sign out warning:', error);
      }
      
      // Only after Supabase signOut completes successfully, update state
      setSession(null);
      setUser(null);
      setIsDemo(false);
      
      // Success message
      toast({
        title: "Signed out successfully",
        description: "You have been signed out.",
      });
      
      // Use routing with a param to indicate logout
      window.location.href = '/auth?just_logged_out=true';
      
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
      
      toast({
        title: "Sign out failed",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
      
      // Even if there's an error, redirect to the auth page
      window.location.href = '/auth';
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

  // Enhanced reset password function with better diagnostics
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Attempting password reset for email: ${email}`);
      
      // Use Supabase's built-in password reset method
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      // Log the response for diagnostic purposes
      console.log('Password reset response:', { data, error });
      
      if (error) {
        throw error;
      }
      
      // Even if there's no error, double-check that Supabase accepted the request
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.warn('Password reset returned empty data, but no error');
      }
      
      // Try to use our admin API as a fallback method to send a reset link
      try {
        // This endpoint would need to be created server-side to use Supabase admin API
        const response = await fetch('/api/admin-password-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        const adminResetResult = await response.json();
        console.log('Admin password reset result:', adminResetResult);
        
        if (adminResetResult.success) {
          console.log('Admin password reset successful');
        }
      } catch (adminError) {
        // Just log this error, don't let it affect the user experience
        console.warn('Failed to use admin reset fallback:', adminError);
      }
      
      // Success message with additional guidance
      toast({
        title: "Password reset link sent",
        description: "Please check your email inbox and spam folder for the reset link. It may take a few minutes to arrive.",
        duration: 6000, // Show for longer (6 seconds)
      });
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send reset link');
      
      // Provide a more helpful error message with troubleshooting steps
      toast({
        title: "Password reset request issue",
        description: `${error.message || 'Issue sending reset link'}. Please check that your email address is correct and try again.`,
        variant: "destructive",
        duration: 8000, // Show for even longer (8 seconds)
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
    resetPassword,
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