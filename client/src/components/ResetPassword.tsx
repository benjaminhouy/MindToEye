import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Schema for password validation
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check if we have a hash in the URL for password reset
  useEffect(() => {
    const checkResetSession = async () => {
      try {
        // Check if there's a recovery token in the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        
        if (type !== 'recovery') {
          setResetError('Invalid or expired reset link');
          setLoading(false);
          return;
        }
        
        // We have a valid recovery session
        setLoading(false);
      } catch (error) {
        console.error('Error checking reset session:', error);
        setResetError('Could not verify reset session');
        setLoading(false);
      }
    };
    
    checkResetSession();
  }, []);
  
  // Form setup
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsSubmitting(true);
      setResetError(null);
      
      // Update the password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (error) {
        throw error;
      }
      
      // Mark as complete and show success message
      setResetComplete(true);
      
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset",
      });
      
      // After a brief delay, redirect to login
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
      
    } catch (error: any) {
      console.error('Password update error:', error);
      setResetError(error.message || 'Failed to reset password');
      
      toast({
        title: "Password reset failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Verifying reset link...</p>
        </CardContent>
      </Card>
    );
  }

  if (resetError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset Failed</CardTitle>
          <CardDescription>
            We couldn't verify your reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{resetError}</AlertDescription>
          </Alert>
          <p className="mt-4 text-sm text-muted-foreground">
            Your reset link may have expired or is invalid. Please request a new password reset.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full"
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>
          Enter your new password
        </CardDescription>
      </CardHeader>
      
      {resetComplete ? (
        <CardContent className="pt-4">
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-600">
              Password reset successful. You will be redirected to login...
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="New password" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm new password" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      )}
    </Card>
  );
}