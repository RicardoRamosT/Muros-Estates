import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const SESSION_KEY = "muros_session";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // If session expired, clear it so the user gets redirected to login
    if (res.status === 401) {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "/login";
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const sessionId = localStorage.getItem(SESSION_KEY);
  const headers: HeadersInit = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (sessionId) {
    headers["Authorization"] = `Bearer ${sessionId}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
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
    const sessionId = localStorage.getItem(SESSION_KEY);
    const headers: HeadersInit = {};
    if (sessionId) {
      headers["Authorization"] = `Bearer ${sessionId}`;
    }

    const url = queryKey.length === 1
      ? (queryKey[0] as string)
      : queryKey.filter(Boolean).join("/").replace(/\/+/g, "/");

    const res = await fetch(url, {
      headers,
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
