import { useState, useEffect, ReactNode } from 'react';
import { AuthContext, type User, type RegisterData, type ProfileData, setAuthToken, getAuthHeaders } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { clearMemberLandingCheck } from '@/lib/member-landing';
import { useToast } from '@/hooks/use-toast';
import { fetchMyConsentStatus } from '@/lib/consent-api';
import { ACCOUNT_CLOSED_MESSAGE } from '@shared/support';

const DEFER_LOGIN_TOAST_KEY = 'awy_defer_login_toast';

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
    
    // Google OAuth sets an httpOnly auth cookie and redirects with only
    // status flags in the query string.
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
    if (authError === 'account_closed') {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast({
        title: "Account closed",
        description: ACCOUNT_CLOSED_MESSAGE,
      });
      setIsLoading(false);
      return;
    }

    if (loginSuccess === 'true') {
      const isNewOAuthUser = urlParams.get('newUser') === 'true';
      window.history.replaceState({}, document.title, window.location.pathname);
      void fetchUser().then(async (loadedUser) => {
        if (loadedUser) {
          let deferToast = isNewOAuthUser;
          if (!deferToast) {
            try {
              const consentStatus = await fetchMyConsentStatus();
              deferToast = Boolean(consentStatus.requirement?.requiresConsent);
            } catch {
              deferToast = isNewOAuthUser;
            }
          }
          if (deferToast) {
            sessionStorage.setItem(DEFER_LOGIN_TOAST_KEY, '1');
            return;
          }
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
    
    // Restore session from the httpOnly auth cookie.
    void fetchUser();
  }, [toast]);

  /** Loads user from /api/auth/me using the httpOnly auth cookie. */
  const fetchUser = async (): Promise<User | null> => {
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
          return null;
        }
        if (response.status === 403 && body.code === "account_deactivated") {
          setAuthToken(null);
          setUser(null);
          window.dispatchEvent(new Event("awy:account-deactivated"));
          return null;
        }
        if (response.status === 403 && body.code === "account_closed") {
          setAuthToken(null);
          setUser(null);
          toast({
            title: "Account closed",
            description: ACCOUNT_CLOSED_MESSAGE,
          });
          return null;
        }
        throw new Error(body.message || "Failed to load profile");
      }
      setUser(body);
      return body as User;
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setAuthToken(null);
      setUser(null);
      return null;
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
      
      clearMemberLandingCheck();
      const loadedUser = await fetchUser();
      if (!loadedUser) {
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

  const updateProfile = async (
    profileData: Partial<ProfileData>,
    options?: {
      successTitle?: string;
      successDescription?: string;
      silent?: boolean;
      duration?: number;
    },
  ): Promise<User | null> => {
    try {
      const response = await apiRequest('PUT', '/api/auth/profile', profileData, getAuthHeaders());
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Profile update failed');
      }
      
      const data = await response.json();
      setUser(data.user);
      
      if (!options?.silent) {
        toast({
          title: options?.successTitle ?? "Profile updated",
          description:
            options?.successDescription ?? "Your profile has been updated successfully.",
          duration: options?.duration,
        });
      }
      return data.user as User;
    } catch (error: any) {
      if (!options?.silent) {
        toast({
          title: "Update failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
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

  const refreshUser = async () => fetchUser();

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