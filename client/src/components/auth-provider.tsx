import { useState, useEffect, ReactNode } from 'react';
import { AuthContext, type User, type RegisterData, type ProfileData, getAuthToken, setAuthToken, getAuthHeaders } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
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
    
    // Handle Google OAuth redirect with token
    const oauthToken = urlParams.get('token');
    const loginSuccess = urlParams.get('loginSuccess');
    
    if (oauthToken && loginSuccess === 'true') {
      // Store the OAuth token
      setAuthToken(oauthToken);
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Fetch user data with the new token
      fetchUser();
      toast({
        title: "Login successful!",
        description: "Welcome to andWeYoga!",
      });
      return;
    }
    
    // Check if user just verified their email
    if (urlParams.get('verified') === 'true') {
      toast({
        title: "Email verified!",
        description: "Your email has been verified successfully. You can now sign in.",
      });
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Normal token check for existing sessions
    const token = getAuthToken();
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchUser = async () => {
    try {
      const response = await apiRequest('GET', '/api/auth/me', undefined, getAuthHeaders());
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, remove it
        setAuthToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setAuthToken(null);
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
      setAuthToken(data.token);
      setUser(data.user);
      
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
    setAuthToken(null);
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    register,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}