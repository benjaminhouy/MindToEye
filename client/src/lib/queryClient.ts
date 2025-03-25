import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  customHeaders?: Record<string, string>
): Promise<Response> {
  // Get the auth ID from Supabase if available
  const supabase = (window as any).supabase;
  let authHeaders: Record<string, string> = {};
  
  try {
    // If custom headers already include auth info, use them
    if (customHeaders && customHeaders['x-auth-id']) {
      // Use the custom headers as provided
      // We don't need to do anything else in this block
    } else {
      // First try Supabase auth
      try {
        // Get the current session which includes the JWT token
        const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
        const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };

        if (user?.id) {
          authHeaders['x-auth-id'] = user.id;
          
          // If we have a valid JWT token, include it for Supabase RLS policies
          if (session?.access_token) {
            // Use standard Authorization header with Bearer token format
            authHeaders['Authorization'] = `Bearer ${session.access_token}`;
            console.log("Including JWT token in Authorization header from Supabase");
          }
        }
      } catch (supabaseError) {
        console.warn("Could not get auth from Supabase, trying localStorage:", supabaseError);
      }
      
      // Fallback to localStorage if Supabase auth fails or is unavailable
      if (!authHeaders['x-auth-id']) {
        const storedAuthId = localStorage.getItem('authId');
        const storedToken = localStorage.getItem('authToken');
        
        if (storedAuthId) {
          authHeaders['x-auth-id'] = storedAuthId;
          
          if (storedToken) {
            authHeaders['Authorization'] = `Bearer ${storedToken}`;
            console.log("Including stored token in Authorization header from localStorage");
          }
        }
      }
    }
  } catch (err) {
    console.error("Error setting up auth headers for API request:", err);
  }
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...(customHeaders || {}) // Add custom headers if provided
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the auth ID from Supabase if available
    const supabase = (window as any).supabase;
    let authHeaders: Record<string, string> = {};
    
    try {
      // First try Supabase auth
      try {
        // Import Supabase directly from lib if global instance not available
        const supabaseLib = supabase || ((await import('./supabase')).supabase);
        
        // Use Supabase auth session if available
        const { data: { session } } = await supabaseLib?.auth.getSession() || { data: { session: null } };
        const { data: { user } } = await supabaseLib?.auth.getUser() || { data: { user: null } };
        
        if (user?.id) {
          authHeaders['x-auth-id'] = user.id;
          console.log("Including auth ID in fetch request:", user.id);
          
          // If we have a valid JWT token, include it for Supabase RLS policies
          if (session?.access_token) {
            // Use standard Authorization header with Bearer token format
            authHeaders['Authorization'] = `Bearer ${session.access_token}`;
            console.log("Including JWT token in Authorization header from Supabase");
          }
        }
      } catch (supabaseError) {
        console.warn("Could not get auth from Supabase for fetch request, trying localStorage:", supabaseError);
      }
      
      // Fallback to localStorage if Supabase auth fails or is unavailable
      if (!authHeaders['x-auth-id']) {
        const storedAuthId = localStorage.getItem('authId');
        const storedToken = localStorage.getItem('authToken');
        
        if (storedAuthId) {
          authHeaders['x-auth-id'] = storedAuthId;
          console.log("Including stored auth ID in fetch request:", storedAuthId);
          
          if (storedToken) {
            authHeaders['Authorization'] = `Bearer ${storedToken}`;
            console.log("Including stored token in Authorization header from localStorage");
          }
        }
      }
    } catch (err) {
      console.error("Error setting up auth headers for fetch request:", err);
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: authHeaders
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Export the queryClient for use throughout the application
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
