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
    .email('Please enter a valid email address')
    .min(5, 'Email is required'),
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

  // Initialize form
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: AccountFormValues) => {
    try {
      setIsSubmitting(true);
      await saveDemoAccount(values.email);
      
      toast({
        title: 'Account created successfully!',
        description: 'Your work has been saved to your new account.',
        variant: 'default',
      });
      
      setOpen(false);
      // No need to redirect, just refresh the current page
      window.location.reload();
    } catch (error) {
      console.error('Error creating account:', error);
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
                Create a free account to save all your projects and concepts forever.
                Everything you've created will be preserved automatically.
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
                {...form.register('email')}
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
                </>
              ) : (
                'Create Free Account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}