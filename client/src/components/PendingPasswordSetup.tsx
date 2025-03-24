import { useState, useEffect } from 'react';
import { SetPasswordDialog } from '@/components/SetPasswordDialog';

export function PendingPasswordSetup() {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  
  useEffect(() => {
    // Check if there's a pending password setup in session storage
    const pendingEmail = sessionStorage.getItem('pendingPasswordSetup');
    
    if (pendingEmail) {
      // Remove it from session storage to prevent showing again on refresh
      sessionStorage.removeItem('pendingPasswordSetup');
      
      // Set email and show dialog
      setSavedEmail(pendingEmail);
      setShowPasswordDialog(true);
    }
  }, []);
  
  if (!showPasswordDialog || !savedEmail) {
    return null;
  }
  
  return (
    <SetPasswordDialog 
      open={showPasswordDialog} 
      onOpenChange={(open) => {
        setShowPasswordDialog(open);
      }}
      email={savedEmail}
    />
  );
}