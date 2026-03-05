import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest, SESSION_KEY } from "./queryClient";

interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  permissions: Record<string, any> | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser({
          ...userData,
          permissions: userData.permissions || {},
        });
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await response.json();
    
    localStorage.setItem(SESSION_KEY, data.sessionId);
    setUser({
      ...data.user,
      permissions: data.user.permissions || {},
    });
  };

  const logout = async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
