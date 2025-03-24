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

  // Handle logout detection
  useEffect(() => {
    // Check for logout flag
    const justLoggedOut = sessionStorage.getItem('justLoggedOut') === 'true';
    
    if (justLoggedOut) {
      console.log('Logout detected, redirecting to auth page');
      
      // Clear the flag
      sessionStorage.removeItem('justLoggedOut');
      
      // Redirect to auth page
      setRedirecting(true);
      navigate('/auth');
      
      return;
    }
    
    // Clean up session-specific items when no user is logged in
    if (!user && !session) {
      console.log('No user session detected, cleaning up app-specific state');
      // Only clear app-specific items that we control
      const appSpecificItems = ['pendingPasswordSetup', 'savedEmail'];
      appSpecificItems.forEach(item => {
        if (sessionStorage.getItem(item)) {
          sessionStorage.removeItem(item);
        }
      });
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