import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// Form validation schema
const accountSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface DemoSaveWorkDialogProps {
  children: React.ReactNode;
}

export function DemoSaveWorkDialog({ children }: DemoSaveWorkDialogProps) {
  const { user, saveDemoAccount, setPassword, isDemo } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if this is a saved account that needs password setup
  const isPendingPasswordSetup = 
    !isDemo && 
    user?.user_metadata?.converted && 
    typeof window !== 'undefined' && 
    window.sessionStorage.getItem('pendingPasswordSetup') === 'true';

  // Initialize form
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: AccountFormValues) => {
    try {
      // Additional client-side validation to ensure email is provided
      if (!values.email || values.email.trim() === '') {
        form.setError('email', { 
          type: 'required', 
          message: 'Please enter your email address' 
        });
        return;
      }

      setIsSubmitting(true);
      await saveDemoAccount(values.email);
      
      toast({
        title: 'Work saved successfully!',
        description: 'Your work is now saved to the email you provided. Your projects are accessible to you now and in the future.',
        variant: 'default',
      });
      
      // Close current dialog
      setOpen(false);
      
      // Store in session storage that we need to show the password dialog after reload
      sessionStorage.setItem('pendingPasswordSetup', 'true');
      sessionStorage.setItem('savedEmail', values.email);
      
      // Refresh the page to load the updated user state
      window.location.reload();
    } catch (error) {
      console.error('Error creating account:', error);
      
      // Check for specific error responses from the server
      if (error instanceof Error) {
        // Try to parse the error message if it's JSON
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.error === 'This email is already registered') {
            // Set field-specific error for email already in use
            form.setError('email', {
              type: 'manual',
              message: 'This email is already registered. Please use a different email address.'
            });
            toast({
              title: 'Email already registered',
              description: errorData.message || 'Please use a different email address.',
              variant: 'destructive',
            });
            return;
          }
        } catch (e) {
          // Not JSON, use the error message as is
        }
      }
      
      // General error handling
      toast({
        title: 'Failed to create account',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a separate schema for password form
  const passwordSchema = z.object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password is too long'),
  });

  type PasswordFormValues = z.infer<typeof passwordSchema>;

  // Initialize password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
    },
  });

  // Handle password submission for converted users
  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      setIsSubmitting(true);
      await setPassword(values.password);
      
      // Close the dialog
      setOpen(false);
      
      // Clear the session storage flag
      sessionStorage.removeItem('pendingPasswordSetup');
      
      toast({
        title: 'Password set successfully!',
        description: 'Your account is now secure. You can log in with your email and password anytime.',
        variant: 'default',
      });
      
      // Refresh the page to update the UI state
      window.location.reload();
    } catch (error) {
      console.error('Error setting password:', error);
      toast({
        title: 'Failed to set password',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render anything if neither in demo mode nor pending password setup
  if (!isDemo && !isPendingPasswordSetup) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {isPendingPasswordSetup ? (
          // Password setup form for converted users
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <DialogHeader>
              <DialogTitle>Set Your Password</DialogTitle>
              <DialogDescription>
                <span className="block mb-2">
                  <strong>Secure your account!</strong> Set a password to protect your work.
                </span>
                <span className="block">
                  Your account is already saved with email: <strong>{sessionStorage.getItem('savedEmail')}</strong>.
                  Set a password to complete the account setup.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  {...passwordForm.register('password', { required: 'Password is required' })}
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Allow skipping password setup by removing the flag
                  sessionStorage.removeItem('pendingPasswordSetup');
                  setOpen(false);
                  window.location.reload();
                }}
                disabled={isSubmitting}
              >
                Skip For Now
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting Password...
                  </>
                ) : (
                  'Set Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // Original email form for demo users
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Save Your Work</DialogTitle>
              <DialogDescription>
                <span className="block mb-2">
                  <strong>Don't lose your creative work!</strong> Demo accounts have limited storage time.
                </span>
                <span className="block">
                  Save your work by providing an email address. Your current session will remain active,
                  and all your projects will be saved.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  {...form.register('email', { required: 'Email is required' })}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Your Work...
                  </>
                ) : (
                  'Save Your Work'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}