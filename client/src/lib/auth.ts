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
  // Health Update fields - mandatory for booking sessions
  healthUpdateText?: string | null;
  healthDocumentUrls?: string[] | null;
  healthUpdateHistory?: import("@shared/health-disclosure").HealthHistoryEntry[] | null;
  dateOfBirth?: string | null;
  profileCompletionStatus: 'incomplete' | 'complete';
  healthUpdateLastModified?: string | null;
  whatsappConsent?: boolean;
  whatsappConsentAt?: string | null;
  addressStreet?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  addressState?: string | null;
  addressPincode?: string | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  updateProfile: (
    userData: Partial<ProfileData>,
    options?: { successTitle?: string; silent?: boolean },
  ) => Promise<User | null>;
  /** Re-fetch /api/auth/me (cookie or Bearer), e.g. after health save */
  refreshUser: () => Promise<User | null>;
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
  dateOfBirth?: string;
  healthUpdateText?: string;
  healthDocumentUrls?: string[];
  whatsappConsent?: boolean;
  whatsappConsentSource?: string;
  addressStreet?: string;
  addressLine2?: string;
  addressCity?: string;
  addressCountry?: string;
  addressState?: string;
  addressPincode?: string;
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
  return null;
}

export function setAuthToken(token: string | null): void {
  // Member auth is cookie-backed; clear any legacy localStorage token.
  localStorage.removeItem('authToken');
}

export function getAuthHeaders(): Record<string, string> {
  return {};
}