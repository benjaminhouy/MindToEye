import { useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

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

// Schema for email validation
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const { toast } = useToast();
  const { resetPassword, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // Form setup
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      
      // Use the auth context's resetPassword method
      await resetPassword(data.email);
      
      // Mark as sent and show success message
      setResetSent(true);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      // Toast notifications are already handled in the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <Button 
          variant="ghost" 
          className="p-0 h-8 w-8 absolute left-4 top-4" 
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          We'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      
      {resetSent ? (
        <CardContent className="pt-4">
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Reset link sent. Please check your email inbox.
            </AlertDescription>
          </Alert>
          <div className="space-y-3 mb-4">
            <p className="text-sm text-muted-foreground">
              If you don't see the email in a few minutes:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Check your spam/junk folder</li>
              <li>Verify you entered the correct email address</li>
              <li>The link will expire in 24 hours</li>
            </ul>
            <p className="text-sm font-medium">
              Note: Some email providers may delay or block password reset emails. If you don't receive an email, try again with a different email address or contact support.
            </p>
          </div>
          <div className="flex flex-col space-y-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => form.reset() && setResetSent(false)}
            >
              Try again with different email
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              Back to login
            </Button>
          </div>
        </CardContent>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="pt-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your.email@example.com" 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      )}
    </Card>
  );
}