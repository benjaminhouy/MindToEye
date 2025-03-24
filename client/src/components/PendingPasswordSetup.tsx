import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { DemoSaveWorkDialog } from "./DemoSaveWorkDialog";
import { Button } from "./ui/button";
import { ZapIcon } from "lucide-react";

/**
 * This component checks for pending password setup in sessionStorage
 * and automatically shows the password setup dialog if needed.
 * It should be mounted near the top of the component tree.
 */
export function PendingPasswordSetup() {
  const { user, session, isDemo } = useAuth();
  const [showDialog, setShowDialog] = useState(false);

  // Check if there's a pending password setup
  useEffect(() => {
    const checkPendingPasswordSetup = () => {
      // Only run this for non-demo users who are logged in
      if (
        !isDemo &&
        user?.id &&
        session?.access_token &&
        user?.user_metadata?.converted &&
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("pendingPasswordSetup") === "true"
      ) {
        setShowDialog(true);
      }
    };

    // Check on initial load
    checkPendingPasswordSetup();

    // Also check whenever auth state changes
    const interval = setInterval(checkPendingPasswordSetup, 1000);
    return () => clearInterval(interval);
  }, [user, session, isDemo]);

  // Don't render anything if there's no pending password setup
  if (!showDialog) {
    return null;
  }

  return (
    <DemoSaveWorkDialog>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setShowDialog(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <ZapIcon className="mr-2 h-4 w-4" />
        Set Password
      </Button>
    </DemoSaveWorkDialog>
  );
}