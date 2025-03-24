import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon, BellIcon, UserIcon, LogOutIcon, SettingsIcon, ZapIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DemoSaveWorkDialog } from "@/components/DemoSaveWorkDialog";

const Header = () => {
  const [location] = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, session, signOut, isDemo } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      console.log("Starting standard Supabase signOut process");
      
      // Set a flag to help with proper redirection after logout
      // This is a safer approach than manipulating storage directly
      sessionStorage.setItem('justLoggedOut', 'true');
      
      // Standard Supabase signOut - should properly clear all tokens
      await signOut();
      
      // Use the router for navigation instead of direct location manipulation
      window.location.href = '/auth';
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Error during logout:", error);
      
      // Even with an error, we still redirect to the auth page
      window.location.href = '/auth';
      
      toast({
        title: "Error during logout",
        description: "There was a problem signing out. You've been redirected to the login page.",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    // Look for a name or email from various sources
    const savedEmail = typeof window !== 'undefined' ? window.sessionStorage.getItem('savedEmail') : null;
    const name = user?.user_metadata?.name || 
                 user?.user_metadata?.email || 
                 savedEmail || 
                 user?.email || 
                 "";
                 
    if (!name) return "U";
    
    // If it's an email, just take the first letter
    if (name.includes("@")) {
      return name[0].toUpperCase();
    }
    
    // Otherwise try to get initials from full name
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    
    return name[0].toUpperCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/">
                <div className="flex items-center cursor-pointer">
                  <svg
                    className="h-8 w-8 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
                      fill="currentColor"
                    />
                    <path
                      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 16V20M12 4V8M16 12H20M4 12H8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="ml-2 text-xl font-bold text-gray-900">MindToEye</span>
                </div>
              </Link>
            </div>

            {/* Primary Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              <Link href="/">
                <div
                  className={`${
                    location === "/"
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}
                >
                  Dashboard
                </div>
              </Link>
              <Link href="/projects">
                <div
                  className={`${
                    location.startsWith("/projects")
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}
                >
                  Projects
                </div>
              </Link>
              <Link href="/templates">
                <div
                  className={`${
                    location.startsWith("/templates")
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}
                >
                  Templates
                </div>
              </Link>
              <Link href="/resources">
                <div
                  className={`${
                    location.startsWith("/resources")
                      ? "border-primary text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}
                >
                  Resources
                </div>
              </Link>
            </nav>
          </div>

          {/* Right side navigation */}
          <div className="flex items-center">
            <button className="bg-primary-50 p-1 rounded-full text-primary hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" />
            </button>

            {/* Profile dropdown */}
            <div className="ml-3 relative" ref={dropdownRef}>
              <div>
                <button
                  type="button"
                  className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  id="user-menu-button"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className="sr-only">Open user menu</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </div>

              {/* Dropdown menu */}
              {isDropdownOpen && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex={-1}
                >
                  <div className="px-4 py-3">
                    <p className="text-sm">Signed in as</p>
                    <div className="flex items-center">
                      <p className="text-sm font-medium truncate">
                        {/* Check for saved email first from user_metadata.email */}
                        {user?.user_metadata?.email || 
                         /* Then check for user_metadata.converted flag with sessionStorage savedEmail */
                         (user?.user_metadata?.converted && typeof window !== 'undefined' && window.sessionStorage.getItem('savedEmail')) || 
                         /* Then check regular email field */
                         user?.email || 
                         /* Fallback to anonymous label */
                         'Anonymous User'}
                      </p>
                      {isDemo && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                          Demo
                        </span>
                      )}
                      {!isDemo && user?.user_metadata?.converted && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Saved
                        </span>
                      )}
                      {!isDemo && !user?.user_metadata?.converted && user?.app_metadata?.provider === 'anonymous' && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Anonymous
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100"></div>
                  
                  <Link href="/profile">
                    <div
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
                      role="menuitem"
                      tabIndex={-1}
                      id="user-menu-item-0"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      Your Profile
                    </div>
                  </Link>
                  <Link href="/settings">
                    <div
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
                      role="menuitem"
                      tabIndex={-1}
                      id="user-menu-item-1"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Settings
                    </div>
                  </Link>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    role="menuitem"
                    tabIndex={-1}
                    id="user-menu-item-2"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            {/* For demo users */}
            {isDemo && (
              <DemoSaveWorkDialog>
                <Button size="sm" className="ml-4" variant="secondary">
                  <ZapIcon className="-ml-0.5 mr-2 h-4 w-4" />
                  Save Your Work
                </Button>
              </DemoSaveWorkDialog>
            )}
            
            {/* For anonymous users who have saved email but not set password yet */}
            {!isDemo && user?.user_metadata?.converted && typeof window !== 'undefined' && window.sessionStorage.getItem('pendingPasswordSetup') && (
              <DemoSaveWorkDialog>
                <Button size="sm" className="ml-4" variant="secondary">
                  <ZapIcon className="-ml-0.5 mr-2 h-4 w-4" />
                  Set Password
                </Button>
              </DemoSaveWorkDialog>
            )}
            
            {/* Show New Project button for non-demo users or fully converted users */}
            {(!isDemo || (user?.user_metadata?.converted && !window.sessionStorage.getItem('pendingPasswordSetup'))) && (
              <Link href="/projects/new">
                <Button size="sm" className="ml-4">
                  <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
                  New Project
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
