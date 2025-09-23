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

  // Check for existing admin token on mount
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      verifyAdminToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyAdminToken = async (token: string) => {
    try {
      const response = await fetch("/api/admin/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
        localStorage.setItem("adminToken", token);
      } else {
        localStorage.removeItem("adminToken");
        setAdmin(null);
      }
    } catch (error) {
      console.error("Admin token verification failed:", error);
      localStorage.removeItem("adminToken");
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const data = await response.json();
      setAdmin(data.admin);
      localStorage.setItem("adminToken", data.token);
    } catch (error) {
      console.error("Admin login error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setAdmin(null);
    queryClient.clear(); // Clear any cached admin data
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}