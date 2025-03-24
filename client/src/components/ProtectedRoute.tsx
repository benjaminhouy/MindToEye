import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * A component that protects routes requiring authentication following Supabase best practices
 * If the user is not authenticated, they are redirected to the login page
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, session, loading, isDemo } = useAuth();
  const [currentLocation, navigate] = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Ensure we've completed a full auth check before making any decisions
  useEffect(() => {
    if (!loading) {
      // Only mark as checked when we've actually completed loading
      if (!authChecked) {
        setAuthChecked(true);
      }
    }
  }, [loading, authChecked]);

  // Clean up session-specific items and perform auth checks
  useEffect(() => {
    // Only proceed if we've completed the auth check
    if (!authChecked) return;

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
      
      // Safely handle redirection outside the render cycle
      const safeRedirect = () => {
        // If we're not on the auth page and we don't have auth, redirect
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/auth' && 
            !redirecting) {
          console.log("No authenticated user detected, redirecting to login page");
          setRedirecting(true);
          navigate('/auth');
        }
      };
      
      // Use requestAnimationFrame for better timing with browser rendering cycle
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(safeRedirect);
      } else {
        // Fallback to setTimeout if requestAnimationFrame is not available
        setTimeout(safeRedirect, 0);
      }
    }
  }, [user, session, navigate, redirecting, authChecked]);

  // Log auth status and handle explicit logout
  useEffect(() => {
    // Only proceed if we've completed the auth check
    if (!authChecked) return;

    // Log the current authentication status for debugging
    console.log("ProtectedRoute status:", { 
      loading, 
      authenticated: !!user, 
      sessionExists: !!session,
      isDemo,
      currentLocation,
      redirecting,
      authChecked
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
  }, [user, session, loading, isDemo, currentLocation, redirecting, authChecked]);

  // Handle different states with appropriate UI

  // 1. Still checking authentication or redirecting
  if (loading || !authChecked || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-gray-600">
            {redirecting 
              ? "Redirecting to login..." 
              : loading 
                ? "Verifying your session..." 
                : "Checking authentication..."}
          </p>
        </div>
      </div>
    );
  }

  // 2. Authentication checking complete but no valid session
  const hasConvertedAccount = typeof window !== 'undefined' && 
    window.sessionStorage.getItem('savedEmail') && 
    window.sessionStorage.getItem('pendingPasswordSetup');
    
  // If not authenticated (and not a special case) and not on auth page, redirect
  if (!user && !isDemo && !hasConvertedAccount && currentLocation !== '/auth') {
    console.log("Not authenticated and not on auth page - redirecting immediately");
    
    // Use requestAnimationFrame to perform the redirect in sync with the browser's render cycle
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        navigate('/auth');
      });
    } else {
      navigate('/auth');
    }
    
    // Show minimal loading state while redirect happens
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 3. User is authenticated or special case (demo, converted account)
  // Render the protected content
  return <>{children}</>;
}