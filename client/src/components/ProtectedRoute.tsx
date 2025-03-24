import { ReactNode, useEffect } from 'react';
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

  useEffect(() => {
    console.log("ProtectedRoute status:", { 
      loading, 
      authenticated: !!user, 
      sessionExists: !!session,
      isDemo,
      currentLocation 
    });

    // Check for user authentication status that includes:
    // 1. Regular authenticated users (user exists and has session)
    // 2. Demo users (isDemo flag is true)
    // 3. Anonymous users who may have converted (check session storage)
    const hasConvertedAccount = typeof window !== 'undefined' && 
      window.sessionStorage.getItem('savedEmail') && 
      window.sessionStorage.getItem('pendingPasswordSetup');
      
    if (!loading && !user && !isDemo && !hasConvertedAccount) {
      console.log("No authenticated user detected, redirecting to login page");
      navigate('/auth');
    }
  }, [user, session, loading, isDemo, navigate, currentLocation]);

  // Show a loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not already at the auth page, show nothing (redirection will happen)
  const hasConvertedAccount = typeof window !== 'undefined' && 
    window.sessionStorage.getItem('savedEmail') && 
    window.sessionStorage.getItem('pendingPasswordSetup');
    
  if (!user && !isDemo && !hasConvertedAccount && currentLocation !== '/auth') {
    console.log("Not authenticated and not on auth page - waiting for redirect");
    return null;
  }

  // Only render children if user is authenticated, is a demo user, or we're on the auth page
  return <>{children}</>;
}