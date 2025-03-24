import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Import password reset components
import ForgotPassword from '@/components/ForgotPassword';
import ResetPassword from '@/components/ResetPassword';

export default function AuthPage() {
  // Get authentication context
  const { user, session, signIn, signUp, startDemoSession, loading, error } = useAuth();
  
  // For redirecting after successful authentication
  const [, navigate] = useLocation();
  
  // For showing toast notifications
  const { toast } = useToast();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we're on a password reset flow
        const searchParams = new URLSearchParams(window.location.search);
        const isReset = searchParams.get('reset') === 'true' || window.location.hash.includes('type=recovery');
        
        if (isReset) {
          setIsPasswordReset(true);
          setPageLoading(false);
          return;
        }
        
        // If we have a user and session, redirect to the dashboard
        if (user && session) {
          console.log("User already authenticated, redirecting to dashboard");
          navigate("/");
          return;
        }
        
        // Check if we just logged out (from the URL parameter)
        const justLoggedOut = searchParams.get('just_logged_out') === 'true';
        
        if (justLoggedOut) {
          console.log("Just logged out parameter detected, ensuring clean state");
          // We don't need to do anything special here as auth-context already handled logout
        }
        
        setPageLoading(false);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setPageLoading(false);
      }
    };
    
    checkAuth();
  }, [user, session, navigate]);
  
  // Handle demo session
  const handleDemoClick = useCallback(async () => {
    try {
      setDemoLoading(true);
      console.log("Starting demo session");
      await startDemoSession();
      console.log("Demo session started, redirecting to dashboard");
      navigate("/");
    } catch (error) {
      console.error("Error starting demo session:", error);
    } finally {
      setDemoLoading(false);
    }
  }, [startDemoSession, navigate]);

  // Check for demo=true in URL parameters when component mounts
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const demoParam = searchParams.get('demo');
    
    if (demoParam === 'true') {
      console.log("Demo parameter detected in URL, starting demo session automatically");
      handleDemoClick();
    }
  }, [handleDemoClick]);

  // Handle form submissions
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sign in attempt with:", email);
    try {
      await signIn(email, password);
      console.log("Sign in completed, redirecting user...");
      // Manual redirection after successful login
      navigate("/");
    } catch (error: any) {
      console.error("Error during sign in:", error);
      
      // Make sure we show a toast for the error, especially for invalid credentials
      toast({
        title: "Login failed",
        description: error?.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sign up attempt with:", email);
    try {
      await signUp(email, password);
      console.log("Sign up completed successfully");
      // Stay on the auth page after signup to show verification message
      
      // Show success message
      toast({
        title: "Registration successful",
        description: "Please check your email for verification instructions.",
      });
    } catch (error: any) {
      console.error("Error during sign up:", error);
      
      // Show error message
      toast({
        title: "Registration failed",
        description: error?.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show loading spinner if checking authentication status
  if (pageLoading || (loading && !demoLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show password reset form if we're on a reset flow
  if (isPasswordReset) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              MindToEye
            </h1>
            <p className="text-gray-600 mt-2">
              Reset your password
            </p>
          </div>
          
          <ResetPassword />
        </div>
      </div>
    );
  }

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              MindToEye
            </h1>
            <p className="text-gray-600 mt-2">
              Reset your password
            </p>
          </div>
          
          <ForgotPassword onBack={() => setShowForgotPassword(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            MindToEye
          </h1>
          <p className="text-gray-600 mt-2">
            Transform your brand concepts into visual reality
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <div className="text-right">
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm text-blue-600"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowForgotPassword(true);
                        }}
                      >
                        Forgot password?
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Register to start building amazing brand visuals
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8">
          <Separator className="my-4" />
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Don't want to create an account yet?
            </p>
            <p className="text-xs text-amber-600 mb-4">
              <strong>Note:</strong> Demo content is temporary and may be removed after 14 days. Upgrade anytime to save your work.
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleDemoClick} 
              disabled={demoLoading}
            >
              {demoLoading ? 'Starting Demo...' : 'Try Demo Without Signup'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}