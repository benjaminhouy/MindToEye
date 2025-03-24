import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'wouter';

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
const upgradeSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(5, 'Email is required'),
});

type UpgradeFormValues = z.infer<typeof upgradeSchema>;

interface DemoUpgradeDialogProps {
  children: React.ReactNode;
}

export function DemoUpgradeDialog({ children }: DemoUpgradeDialogProps) {
  const { upgradeDemoAccount, isDemo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const form = useForm<UpgradeFormValues>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: {
      email: '',
    },
  });

  // Only show the upgrade dialog if the user is in demo mode
  if (!isDemo) {
    return null;
  }

  const onSubmit = async (values: UpgradeFormValues) => {
    try {
      setIsSubmitting(true);
      await upgradeDemoAccount(values.email);
      
      toast({
        title: 'Account upgraded successfully!',
        description: 'You can now use all features of MindToEye with your new account.',
        variant: 'default',
      });
      
      setOpen(false);
      // Redirect to dashboard or another appropriate page
      navigate('/');
    } catch (error) {
      console.error('Error upgrading account:', error);
      toast({
        title: 'Failed to upgrade account',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Upgrade Your Demo Account</DialogTitle>
            <DialogDescription>
              Get full access to MindToEye by upgrading your demo account to a regular account.
              All your projects and concepts will be preserved.
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Upgrading...
                </>
              ) : (
                'Upgrade Account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}