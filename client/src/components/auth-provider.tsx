import { useState, useEffect, ReactNode } from 'react';
import { AuthContext, type User, type RegisterData, type ProfileData, getAuthToken, setAuthToken, getAuthHeaders } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { clearMemberLandingCheck } from '@/lib/member-landing';
import { useToast } from '@/hooks/use-toast';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is authenticated on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Google OAuth: server sets httpOnly auth cookie and may redirect with only
    // ?loginSuccess=true (no token in URL — intentional). Passport flow may still
    // append ?token=... — support both.
    const oauthToken = urlParams.get('token');
    const loginSuccess = urlParams.get('loginSuccess');

    const authError = urlParams.get('error');
    if (authError === 'google_auth_failed') {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast({
        title: "Google sign-in failed",
        description: "Please try again or contact support if this continues.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    if (authError === 'account_deactivated') {
      window.history.replaceState({}, document.title, window.location.pathname);
      window.dispatchEvent(new Event("awy:account-deactivated"));
      setIsLoading(false);
      return;
    }

    if (loginSuccess === 'true') {
      if (oauthToken) {
        setAuthToken(oauthToken);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      void fetchUser().then((ok) => {
        if (ok) {
          toast({
            title: "Login successful!",
            description: "Welcome to andWeYoga!",
          });
        } else {
          toast({
            title: "Sign-in incomplete",
            description: "We could not load your account. Please try signing in again.",
            variant: "destructive",
          });
        }
      });
      return;
    }
    
    // Check if user just verified their email
    if (urlParams.get('verified') === 'true') {
      toast({
        title: "Email verified!",
        description: "Your email has been verified successfully. You can now sign in.",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Restore session from httpOnly cookie and/or Bearer token in localStorage
    void fetchUser();
  }, [toast]);

  /** Loads user from /api/auth/me using Bearer token (if any) and/or auth cookie. */
  const fetchUser = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          setAuthToken(null);
          setUser(null);
          return false;
        }
        if (response.status === 403 && body.code === "account_deactivated") {
          setAuthToken(null);
          setUser(null);
          window.dispatchEvent(new Event("awy:account-deactivated"));
          return false;
        }
        throw new Error(body.message || "Failed to load profile");
      }
      setUser(body);
      return true;
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setAuthToken(null);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      
      const data = await response.json();
      if (data.token) {
        setAuthToken(data.token);
      }
      clearMemberLandingCheck();
      const loaded = await fetchUser();
      if (!loaded) {
        throw new Error("Could not load your profile after login");
      }

      toast({
        title: "Login successful",
        description: "Welcome back to andWeYoga!",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      const data = await response.json();
      
      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProfile = async (profileData: ProfileData) => {
    try {
      const response = await apiRequest('PUT', '/api/auth/profile', profileData, getAuthHeaders());
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Profile update failed');
      }
      
      const data = await response.json();
      setUser(data.user);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    clearMemberLandingCheck();
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
      setAuthToken(null);
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    });
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}