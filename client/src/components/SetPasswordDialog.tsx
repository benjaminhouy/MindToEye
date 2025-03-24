import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

// Form validation schema
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialogClose?: () => void;
}

export function SetPasswordDialog({
  open,
  onOpenChange,
  onDialogClose
}: SetPasswordDialogProps) {
  const { setPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState(() => sessionStorage.getItem('savedEmail') || '');
  
  // Form definition
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });
  
  // Form submission handler
  const onSubmit = async (values: PasswordFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Call the auth context method to set the password
      await setPassword(values.password);
      
      // Close the dialog
      onOpenChange(false);
      if (onDialogClose) {
        onDialogClose();
      }
    } catch (error) {
      console.error('Error setting password:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle skip button
  const handleSkip = () => {
    // Just close the dialog without setting a password
    onOpenChange(false);
    if (onDialogClose) {
      onDialogClose();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set a Password</DialogTitle>
          <DialogDescription>
            {email ? (
              <>Complete your account setup for <strong>{email}</strong> by creating a secure password.</>
            ) : (
              <>Set a password to secure your account and make it easier to log in later.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Create a secure password" 
                      {...field} 
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
                      placeholder="Confirm your password" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button 
                variant="outline" 
                onClick={handleSkip}
                disabled={isSubmitting}
                type="button"
              >
                Maybe Later
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting Password
                  </>
                ) : (
                  'Set Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}