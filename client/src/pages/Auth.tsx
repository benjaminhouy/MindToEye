import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function AuthPage() {
  // Get authentication context
  const { signIn, signUp, startDemoSession, loading, error } = useAuth();
  
  // For redirecting after successful authentication
  const [, navigate] = useLocation();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  
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
    try {
      await signUp(email, password);
      console.log("Sign up completed successfully");
      // Stay on the auth page after signup to show verification message
    } catch (error) {
      console.error("Error during sign up:", error);
    }
  };

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