import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function AuthPage() {
  // Get authentication context
  const { user, session, signIn, signUp, startDemoSession, loading, error } = useAuth();
  
  // For redirecting after successful authentication
  const [, navigate] = useLocation();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (user && session) {
      console.log("User already authenticated, redirecting to dashboard");
      navigate("/");
    } else {
      setPageLoading(false);
    }
  }, [user, session, navigate]);
  
  // Add a fallback solution when CAPTCHA doesn't load
  const [captchaFailed, setCaptchaFailed] = useState(false);

  // Initialize Turnstile when the tab is selected
  useEffect(() => {
    console.log('Turnstile initialization started');
    
    // Extend Window interface to make TypeScript happy
    interface WindowWithTurnstile extends Window {
      turnstile?: any;
      onTurnstileLoaded?: () => void;
    }
    
    const windowWithTurnstile = window as WindowWithTurnstile;
    
    // Create a script element and load it manually
    const loadTurnstileScript = () => {
      // Remove any existing script to avoid duplicates
      const existingScript = document.getElementById('turnstile-script');
      if (existingScript) {
        existingScript.remove();
      }
      
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoaded';
      script.async = true;
      
      // Define the callback function that will be called when Turnstile is loaded
      windowWithTurnstile.onTurnstileLoaded = () => {
        console.log('Turnstile script loaded successfully');
        renderTurnstile();
      };
      
      document.head.appendChild(script);
    };
    
    // Function to render the Turnstile widget
    const renderTurnstile = () => {
      if (!turnstileRef.current) {
        console.warn('Turnstile container not found');
        return;
      }
      
      try {
        // Clear any existing content
        turnstileRef.current.innerHTML = '';
        
        if (typeof windowWithTurnstile.turnstile !== 'undefined') {
          console.log('Rendering Turnstile widget...');
          
          const widgetId = windowWithTurnstile.turnstile.render(turnstileRef.current, {
            sitekey: '0x4AAAAAABBzjlCfk4zosWil',
            theme: 'light',
            callback: (token: string) => {
              console.log('Turnstile token received:', token.substring(0, 20) + '...(truncated)');
              setTurnstileToken(token);
              setCaptchaFailed(false);
            },
            'expired-callback': () => {
              console.log('Turnstile token expired');
              setTurnstileToken(null);
            },
            'error-callback': (error: any) => {
              console.error('Turnstile error:', error);
              setCaptchaFailed(true);
            }
          });
          console.log('Turnstile widget initialized with ID:', widgetId);
        } else {
          console.error('Turnstile not available');
          setCaptchaFailed(true);
        }
      } catch (error) {
        console.error('Error rendering Turnstile widget:', error);
        setCaptchaFailed(true);
      }
    };
    
    // Start loading the script
    loadTurnstileScript();
    
    // Set a timeout to mark the CAPTCHA as failed if it doesn't load within 5 seconds
    const failureTimeout = setTimeout(() => {
      // Check if we have a token, if not, mark as failed
      if (!turnstileToken) {
        console.warn('Turnstile failed to load within timeout period');
        setCaptchaFailed(true);
      }
    }, 5000);
    
    return () => {
      clearTimeout(failureTimeout);
      // Delete the global callback to prevent memory leaks
      delete windowWithTurnstile.onTurnstileLoaded;
    };
  }, []);
  
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
    } catch (error) {
      console.error("Error during sign in:", error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sign up attempt with:", email);
    
    // Handle the case where turnstile has failed to load
    if (captchaFailed) {
      console.log("Turnstile failed to load, attempting to bypass CAPTCHA verification");
      
      try {
        // Try to sign up without CAPTCHA token (will rely on server-side bypass for dev environments)
        await signUp(email, password, "bypass_dev_environment_only");
        console.log("Sign up completed successfully with CAPTCHA bypass");
      } catch (error) {
        console.error("Error during sign up with CAPTCHA bypass:", error);
        alert("CAPTCHA verification is required but failed to load. Please try again later or use the demo option.");
      }
      return;
    }
    
    if (!turnstileToken) {
      console.error("Turnstile verification required");
      alert("Please complete the verification challenge");
      return;
    }
    
    try {
      console.log("Attempting signup with token:", turnstileToken?.substring(0, 20) + "...(truncated)");
      await signUp(email, password, turnstileToken);
      console.log("Sign up completed successfully");
      // Stay on the auth page after signup to show verification message
    } catch (error) {
      console.error("Error during sign up:", error);
      
      // Reset Turnstile widget if there was an error
      // @ts-ignore - Turnstile is loaded from external script
      if (window.turnstile && turnstileRef.current) {
        console.log("Resetting Turnstile widget after error");
        // @ts-ignore - Turnstile is loaded from external script
        window.turnstile.reset(turnstileRef.current);
        setTurnstileToken(null);
      }
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
                  
                  <div className="space-y-2">
                    <Label>Verification</Label>
                    <div ref={turnstileRef} className="cf-turnstile"></div>
                    {!turnstileToken && !captchaFailed && (
                      <p className="text-xs text-amber-600 mt-1">Please complete the verification</p>
                    )}
                    {captchaFailed && (
                      <div className="border border-amber-600 rounded-md p-3 mt-2 bg-amber-50">
                        <p className="text-xs text-amber-800">
                          <strong>Captcha verification could not be loaded.</strong> You can still create an account 
                          by completing the form and clicking "Create Account" - we'll use an alternative verification method.
                        </p>
                      </div>
                    )}
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