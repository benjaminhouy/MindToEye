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
): Promise<Response> {
  // Get the auth ID from Supabase if available
  const supabase = (window as any).supabase;
  let authHeaders: Record<string, string> = {};
  
  try {
    // Use Supabase auth session if available
    const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
    if (user?.id) {
      authHeaders['x-auth-id'] = user.id;
    }
  } catch (err) {
    console.error("Error getting auth user for API request:", err);
  }
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders
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
      // Import Supabase directly from lib if global instance not available
      const supabaseLib = supabase || ((await import('./supabase')).supabase);
      
      // Use Supabase auth session if available
      const { data: { user } } = await supabaseLib?.auth.getUser() || { data: { user: null } };
      if (user?.id) {
        authHeaders['x-auth-id'] = user.id;
        console.log("Including auth ID in fetch request:", user.id);
      }
    } catch (err) {
      console.error("Error getting auth user for fetch request:", err);
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
