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

  // Clean up session-specific items and perform auth checks
  // This is now done with a safer pattern that won't update state during render
  useEffect(() => {
    // Perform session cleanup if no user is logged in
    if (!user && !session) {
      console.log('No user session detected, cleaning up app-specific state');
      
      // Only clear app-specific items that we control
      const appSpecificItems = ['pendingPasswordSetup', 'savedEmail'];
      appSpecificItems.forEach(item => {
        if (sessionStorage.getItem(item)) {
          sessionStorage.removeItem(item);
        }
      });
      
      // We need to use setTimeout to avoid the React setState during render warning
      // This defers the redirection check to the next tick
      setTimeout(() => {
        // If we're not on the auth page and we don't have auth, redirect
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/auth' && 
            !redirecting) {
          console.log("No authenticated user detected, redirecting to login page");
          setRedirecting(true);
          navigate('/auth');
        }
      }, 0);
    }
  }, [user, session, navigate, redirecting]);

  // This effect now just logs the auth status and checks for explicit logout cases
  useEffect(() => {
    // Log the current authentication status for debugging
    console.log("ProtectedRoute status:", { 
      loading, 
      authenticated: !!user, 
      sessionExists: !!session,
      isDemo,
      currentLocation,
      redirecting
    });

    // Handle explicit logout case - forcing full page reload
    // This is important for cases where we need to completely reset the app state
    const justLoggedOut = !user && !session && 
      typeof window !== 'undefined' && 
      window.location.pathname !== '/auth' && 
      !redirecting;
    
    if (justLoggedOut) {
      console.log("Complete logout detected, forcing page reload to /auth");
      
      // Only reload if we're not already redirecting
      if (!redirecting) {
        setRedirecting(true);
        
        // Use the URL parameter to signal that we're coming from a logout
        window.location.href = '/auth?just_logged_out=true';
      }
    }
  }, [user, session, loading, isDemo, currentLocation, redirecting]);

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