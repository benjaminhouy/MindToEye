import { useState, useEffect } from 'react';
import { SetPasswordDialog } from './SetPasswordDialog';

/**
 * This component checks if there's a pending password setup
 * (which happens after a user saves their demo account with an email).
 * It will render the SetPasswordDialog if there's a pending setup.
 */
export function PendingPasswordSetup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  
  useEffect(() => {
    // Check for pending password setup in session storage
    const pendingEmail = sessionStorage.getItem('pendingPasswordSetup');
    if (pendingEmail) {
      console.log('Found pending password setup for:', pendingEmail);
      setEmail(pendingEmail);
      setOpen(true);
    }
  }, []);
  
  // If there's no pending setup, don't render anything
  if (!email) return null;
  
  return (
    <SetPasswordDialog 
      open={open} 
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          // When dialog closes, clear the pendingPasswordSetup from session storage
          sessionStorage.removeItem('pendingPasswordSetup');
        }
      }}
      email={email}
    />
  );
}