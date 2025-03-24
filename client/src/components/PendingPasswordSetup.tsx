import { useEffect, useState } from 'react';
import { SetPasswordDialog } from './SetPasswordDialog';

/**
 * This component checks if there's a pending password setup in the session storage
 * and renders the SetPasswordDialog if needed. This ensures that the password
 * setup dialog appears after a user has saved their demo account with an email.
 * 
 * It uses sessionStorage to persist the state across refreshes and navigation.
 */
export function PendingPasswordSetup() {
  // Track if we need to show the password setup dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Check sessionStorage on component mount
  useEffect(() => {
    const isPending = sessionStorage.getItem('pendingPasswordSetup') === 'true';
    setShowPasswordDialog(isPending);
  }, []);
  
  // Handle dialog close
  const handleDialogClose = () => {
    // Remove the pending flag from sessionStorage
    sessionStorage.removeItem('pendingPasswordSetup');
    setShowPasswordDialog(false);
  };
  
  // Render nothing if no pending setup
  if (!showPasswordDialog) {
    return null;
  }
  
  // Otherwise render the password setup dialog
  return (
    <SetPasswordDialog 
      open={showPasswordDialog} 
      onOpenChange={setShowPasswordDialog}
      onDialogClose={handleDialogClose}
    />
  );
}