import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useToast } from '@/hooks/use-toast';

// Define the context type
type AuthContextType = {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, turnstileToken?: string) => Promise<void>;
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
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Function to refresh the session token before it expires
  const setupSessionRefresh = (currentSession: Session | null) => {
    // Clear any existing refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // If no session or it's our custom local auth, don't set up refresh
    if (!currentSession || currentSession.access_token.startsWith('local-auth-')) {
      return;
    }
    
    try {
      // Calculate when to refresh - aim for 5 minutes before expiry
      const expiresAt = currentSession.expires_at;
      if (!expiresAt) {
        console.warn('Session has no expires_at timestamp, cannot schedule refresh');
        return;
      }
      
      const expiresAtMs = expiresAt * 1000; // Convert to milliseconds
      const refreshTimeMs = expiresAtMs - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry
      
      // If token is already expired or will expire soon, refresh immediately
      if (refreshTimeMs <= 0) {
        console.log('Session token expired or expiring soon, refreshing immediately');
        refreshSession();
        return;
      }
      
      console.log(`Scheduling session refresh in ${Math.round(refreshTimeMs/1000/60)} minutes`);
      
      // Set timer to refresh the token
      refreshTimerRef.current = setTimeout(() => {
        refreshSession();
      }, refreshTimeMs);
    } catch (error) {
      console.error('Error setting up session refresh:', error);
    }
  };
  
  // Function to refresh the session token
  const refreshSession = async () => {
    try {
      console.log('Refreshing auth session token');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        
        // If refresh fails, try to get the current session
        const { data: currentData } = await supabase.auth.getSession();
        if (currentData.session) {
          console.log('Retrieved current session after refresh failure');
          setSession(currentData.session);
          setUser(currentData.session.user);
          setupSessionRefresh(currentData.session);
        } else {
          console.error('No session available after refresh failure, user may need to re-authenticate');
          // Keep the current session for now, it's better than nothing
        }
      } else if (data.session) {
        console.log('Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
        
        // Store credentials for API authentication
        if (data.session.user?.id) {
          localStorage.setItem('authId', data.session.user.id);
        }
        
        // Persist auth credentials
        const userEmail = data.session.user?.email || 
                        data.session.user?.user_metadata?.email;
        if (userEmail) {
          localStorage.setItem('userEmail', userEmail);
        }
        
        // Set up the next refresh
        setupSessionRefresh(data.session);
      }
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
    }
  };
  
  // Effect to set up the auth state listener
  useEffect(() => {
    async function getInitialSession() {
      try {
        setLoading(true);
        
        // First try to use values from localStorage to avoid auth flicker
        const storedAuthId = localStorage.getItem('authId');
        const storedEmail = localStorage.getItem('userEmail');
        
        if (storedAuthId && storedEmail) {
          // We have stored credentials - make an API call to validate them
          try {
            const response = await fetch('/api/user', {
              headers: {
                'x-auth-id': storedAuthId,
                'Authorization': `Bearer local-auth-${storedAuthId}`
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              console.log('Restored session from localStorage:', userData);
              
              // Create a temporary session with the stored data
              const now = new Date();
              const tempSession: Session = {
                access_token: `local-auth-${userData.id}`,
                refresh_token: '',
                token_type: 'bearer',
                expires_in: 86400,
                expires_at: now.getTime() + 86400 * 1000,
                user: {
                  id: userData.id,
                  app_metadata: { provider: userData.isDemo ? 'anonymous' : 'email' },
                  user_metadata: { 
                    email: userData.email,
                    converted: !userData.isDemo
                  },
                  aud: 'authenticated',
                  email: userData.email,
                  created_at: now.toISOString(),
                  updated_at: now.toISOString(),
                  role: 'authenticated',
                  identities: [],
                  confirmed_at: now.toISOString(),
                  last_sign_in_at: now.toISOString(),
                  factors: [],
                  phone: ''
                }
              };
              
              setSession(tempSession);
              setUser(tempSession.user);
              setIsDemo(userData.isDemo);
              setLoading(false);
              
              // We'll still get the Supabase session below, but this prevents a flash of login state
              return;
            }
          } catch (storageError) {
            console.warn('Error restoring from localStorage:', storageError);
            // Continue to get Supabase session
          }
        }
        
        // Get the session from Supabase
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          console.log('Retrieved session from Supabase');
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Set up token refresh
          setupSessionRefresh(initialSession);
          
          // Check if this is a demo user
          const isAnonymous = initialSession.user?.app_metadata?.provider === 'anonymous';
          const isConverted = initialSession.user?.user_metadata?.converted === true;
          setIsDemo(isAnonymous && !isConverted);
          
          // Store credentials for API authentication
          if (initialSession.user?.id) {
            localStorage.setItem('authId', initialSession.user.id);
          }
          
          // Store email in localStorage for persistence across the app
          const userEmail = initialSession.user?.email || 
                          initialSession.user?.user_metadata?.email;
          
          if (userEmail) {
            localStorage.setItem('userEmail', userEmail);
            console.log('Stored user email in localStorage:', userEmail);
          }
        } else {
          console.log('No active session found');
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
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        // Update our state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle demo detection on auth state change
        if (newSession?.user) {
          const isAnonymous = newSession.user.app_metadata.provider === 'anonymous';
          const isConverted = newSession.user.user_metadata.converted === true;
          setIsDemo(isAnonymous && !isConverted);
          
          // If this is a new user or a token refresh, set up the refresh timer
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setupSessionRefresh(newSession);
            
            // Store auth ID for persistence
            localStorage.setItem('authId', newSession.user.id);
            
            // Store email if available
            const userEmail = newSession.user.email || 
                             newSession.user.user_metadata?.email;
            if (userEmail) {
              localStorage.setItem('userEmail', userEmail);
            }
          }
          
          // If this is a new user, register them with our API
          if (event === 'SIGNED_IN') {
            try {
              await registerUserWithApi(newSession.user);
            } catch (error) {
              console.error('Error during API registration:', error);
              // Don't treat this as a fatal error, user might already be registered
            }
          }
        }
        
        if (event === 'SIGNED_OUT') {
          // Clear stored auth data
          localStorage.removeItem('authId');
          localStorage.removeItem('userEmail');
          
          // Clear any refresh timer
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
        }
        
        setLoading(false);
      }
    );

    // Get the initial session
    getInitialSession();

    // Clean up on unmount
    return () => {
      subscription.unsubscribe();
      
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
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
          const now = new Date();
          
          // Create a proper User object with all required fields
          const userWithRequiredFields: User = {
            ...result.user,
            created_at: result.user.created_at || now.toISOString(),
            updated_at: result.user.updated_at || now.toISOString(),
            role: result.user.role || 'authenticated',
            aud: result.user.aud || 'authenticated',
            app_metadata: result.user.app_metadata || {},
            user_metadata: result.user.user_metadata || {},
            identities: result.user.identities || [],
            confirmed_at: result.user.confirmed_at || now.toISOString(),
            last_sign_in_at: result.user.last_sign_in_at || now.toISOString(),
            factors: result.user.factors || [],
            phone: result.user.phone || ''
          };
          
          // Create a complete session object
          const localSession: Session = {
            access_token: `local-auth-${result.user.id}`, // Simplified token
            refresh_token: '',
            token_type: 'bearer', // Required by Session type
            expires_in: 86400,
            expires_at: now.getTime() + 86400 * 1000,
            user: userWithRequiredFields
          };
          
          setUser(result.user);
          setSession(localSession);
          
          // Store authentication data in localStorage
          localStorage.setItem('authId', result.user.id);
          localStorage.setItem('authToken', localSession.access_token);
          
          if (result.user.email) {
            localStorage.setItem('userEmail', result.user.email);
          }
          
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
  const signUp = async (email: string, password: string, turnstileToken?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Call our supabase helper function with the turnstile token
      console.log('Signing up with token:', turnstileToken ? 'Token provided' : 'No token');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: turnstileToken ? {
          captchaToken: turnstileToken
        } : undefined
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
      
      // Store auth ID before we clear the session
      const currentAuthId = user?.id;
      
      try {
        // Try to sign out with Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          // If it's an AuthSessionMissingError, we can ignore it and continue
          if (error.name !== 'AuthSessionMissingError') {
            console.warn('Non-critical sign out error:', error);
          }
        }
      } catch (signOutError) {
        // Log but don't rethrow - we want to clear local state regardless
        console.warn('Error during Supabase sign out:', signOutError);
      }
      
      // Also call our server API to log out (to handle revocation of tokens)
      if (currentAuthId) {
        try {
          await fetch('/api/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-id': currentAuthId
            }
          });
          console.log('Server-side logout completed');
        } catch (serverLogoutError) {
          // Log but continue - client-side logout is more important
          console.warn('Error during server-side logout:', serverLogoutError);
        }
      }
      
      // Always clear local state, even if the Supabase sign out fails
      setSession(null);
      setUser(null);
      setIsDemo(false);
      
      // Also clear any session storage items we've set
      sessionStorage.removeItem('pendingPasswordSetup');
      sessionStorage.removeItem('savedEmail');
      
      // Success message
      toast({
        title: "Signed out successfully",
        description: "You have been signed out.",
      });
      
      // Force reload to clear all app state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
      
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