import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing admin session on mount.
  useEffect(() => {
    void verifyAdminSession();
  }, []);

  const verifyAdminSession = async () => {
    try {
      const response = await fetch("/api/admin/auth/verify", { credentials: "include" });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        setAdmin(null);
      }
    } catch (error) {
      console.error("Admin session verification failed:", error);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = "Login failed";
        try {
          const error = await response.json();
          message = error.message || message;
        } catch {
          if (response.status === 503) {
            message =
              "Database is unavailable. Refresh DATABASE_URL from Railway and restart the server.";
          }
        }
        throw new Error(message);
      }

      const data = await response.json();
      setAdmin(data.admin);
    } catch (error) {
      console.error("Admin login error:", error);
      throw error;
    }
  };

  const logout = () => {
    void fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
      setAdmin(null);
      queryClient.clear(); // Clear any cached admin data
    });
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}