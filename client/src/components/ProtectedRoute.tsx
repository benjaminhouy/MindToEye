import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * A component that protects routes requiring authentication
 * If the user is not authenticated, they are redirected to the login page
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, session, loading, isDemo } = useAuth();
  const [currentLocation, navigate] = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  // Force reauthentication check on page load or refresh
  useEffect(() => {
    // Detect if user just logged out (check for flag placed in storage by logout function)
    const justLoggedOut = sessionStorage.getItem('justLoggedOut') === 'true';
    
    if (justLoggedOut) {
      console.log('Just logged out flag detected, clearing and redirecting');
      // Clear the flag
      sessionStorage.removeItem('justLoggedOut');
      
      // Redirect to auth page and hard refresh to clear React state
      setRedirecting(true);
      window.location.href = '/auth';
      return;
    }
    
    // Clear local storage items that might incorrectly indicate a logged-in state
    if (!user && !session) {
      console.log('No user session detected, cleaning up storage');
      // These should be cleared during logout, but this is a safety net
      const storageItems = ['pendingPasswordSetup', 'savedEmail'];
      storageItems.forEach(item => {
        if (sessionStorage.getItem(item)) {
          sessionStorage.removeItem(item);
        }
      });
      
      // Also check for any Supabase tokens
      const supabaseKeyPattern = /^supabase\./;
      
      // Clear from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && supabaseKeyPattern.test(key)) {
          console.log(`Removing leftover localStorage item: ${key}`);
          localStorage.removeItem(key);
          i = -1; // Restart iteration as indices shift
        }
      }
      
      // Clear from sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && supabaseKeyPattern.test(key)) {
          console.log(`Removing leftover sessionStorage item: ${key}`);
          sessionStorage.removeItem(key);
          i = -1; // Restart iteration as indices shift
        }
      }
    }
  }, [setRedirecting]);

  useEffect(() => {
    // Add an extra check to see if we're actually logged out after logout operation
    const isActuallyLoggedOut = !user && !session && typeof window !== 'undefined' && 
      window.location.pathname !== '/auth' && !redirecting;
    
    if (isActuallyLoggedOut) {
      console.log("Logout detected, redirecting to auth page");
      setRedirecting(true);
      window.location.href = '/auth';
      return;
    }
    
    console.log("ProtectedRoute status:", { 
      loading, 
      authenticated: !!user, 
      sessionExists: !!session,
      isDemo,
      currentLocation,
      redirecting
    });

    // Check for user authentication status that includes:
    // 1. Regular authenticated users (user exists and has session)
    // 2. Demo users (isDemo flag is true)
    // 3. Anonymous users who may have converted (check session storage)
    const hasConvertedAccount = typeof window !== 'undefined' && 
      window.sessionStorage.getItem('savedEmail') && 
      window.sessionStorage.getItem('pendingPasswordSetup');
      
    if (!loading && !user && !isDemo && !hasConvertedAccount && !redirecting) {
      console.log("No authenticated user detected, redirecting to login page");
      setRedirecting(true);
      navigate('/auth');
    }
  }, [user, session, loading, isDemo, navigate, currentLocation, redirecting]);

  // Show a loading spinner while checking authentication
  if (loading || redirecting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">
            {redirecting ? "Redirecting to login..." : "Checking authentication..."}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated and not already at the auth page, show nothing (redirection will happen)
  const hasConvertedAccount = typeof window !== 'undefined' && 
    window.sessionStorage.getItem('savedEmail') && 
    window.sessionStorage.getItem('pendingPasswordSetup');
    
  if (!user && !isDemo && !hasConvertedAccount && currentLocation !== '/auth') {
    console.log("Not authenticated and not on auth page - redirecting");
    // Don't just wait for the effect to run - redirect immediately
    navigate('/auth');
    return null;
  }

  // Only render children if user is authenticated, is a demo user, or we're on the auth page
  return <>{children}</>;
}