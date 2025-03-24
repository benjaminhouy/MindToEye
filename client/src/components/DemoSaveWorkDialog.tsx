import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SetPasswordDialog } from '@/components/SetPasswordDialog';

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
  const { saveDemoAccount, isDemo } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

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
      
      // Save email for password dialog
      setSavedEmail(values.email);
      
      // Close current dialog and open password dialog
      setOpen(false);
      
      // Small delay to allow the first dialog to close
      setTimeout(() => {
        setShowPasswordDialog(true);
      }, 500);
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

  // Only render the dialog when in demo mode
  if (!isDemo) {
    return null;
  }

  return (
    <>
      {/* Email collection dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
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
        </DialogContent>
      </Dialog>

      {/* Password setting dialog (optional second phase) */}
      <SetPasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) {
            // Refresh page when closing the password dialog
            window.location.reload();
          }
        }}
        email={savedEmail}
      />
    </>
  );
}