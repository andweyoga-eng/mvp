import { createContext, useContext } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  primaryMobile: string;
  primaryMobileCountryCode: string;
  secondaryMobile?: string | null;
  secondaryMobileCountryCode?: string | null;
  emergencyMobile: string;
  emergencyMobileCountryCode: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  updateProfile: (userData: ProfileData) => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  primaryMobile?: string;
  primaryMobileCountryCode?: string;
  secondaryMobile?: string;
  secondaryMobileCountryCode?: string;
  emergencyMobile?: string;
  emergencyMobileCountryCode?: string;
}

export interface ProfileData {
  name: string;
  primaryMobile: string;
  primaryMobileCountryCode: string;
  secondaryMobile?: string;
  secondaryMobileCountryCode?: string;
  emergencyMobile: string;
  emergencyMobileCountryCode: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}