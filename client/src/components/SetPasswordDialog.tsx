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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

// Form validation schema
const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

export function SetPasswordDialog({ open, onOpenChange, email }: SetPasswordDialogProps) {
  const { setPassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize form
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Call the API to set the password
      await setPassword(email, values.password);
      
      setIsCompleted(true);
      
      toast({
        title: 'Password set successfully!',
        description: 'You can now use your email and password to sign in.',
        variant: 'default',
      });
      
      // Close after 3 seconds of showing the success message
      setTimeout(() => {
        onOpenChange(false);
      }, 3000);
      
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

  // If user decides to skip, just close the dialog
  const handleSkip = () => {
    toast({
      title: 'Password setup skipped',
      description: 'You can set a password later from your account settings.',
      variant: 'default',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {isCompleted ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle2 className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Password Set Successfully!</h2>
            <p className="text-center text-muted-foreground mb-4">
              Your account is now secured with a password.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Set a Password (Optional)</DialogTitle>
              <DialogDescription>
                <span className="block mb-2">
                  Your work is already saved to <strong>{email}</strong>
                </span>
                <span className="block">
                  Set a password now to secure your account, or skip to do it later.
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
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...form.register('confirmPassword')}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="w-full sm:w-auto order-1 sm:order-none"
              >
                Skip for Now
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
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
        )}
      </DialogContent>
    </Dialog>
  );
}