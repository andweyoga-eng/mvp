import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  variant?: 'login' | 'register';
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement | null, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ onSuccess, variant = 'login' }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const result = await apiRequest('POST', '/api/auth/google-signin', {
        token: response.credential
      });
      
      if (result.ok) {
        const data = await result.json();
        // Set the token in localStorage
        localStorage.setItem('authToken', data.token);
        
        // Trigger auth context update by calling login with empty credentials
        // The auth provider will fetch user data using the stored token
        window.location.reload(); // Force page reload to update auth state
        
        toast({
          title: "Google Sign In Successful!",
          description: `Welcome ${data.user.name}!`,
        });
        
        onSuccess?.();
      } else {
        const error = await result.json();
        throw new Error(error.message || 'Google sign-in failed');
      }
    } catch (error: any) {
      toast({
        title: "Google Sign In Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Google Sign-In when component mounts
  useState(() => {
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
      }
    };

    // Load Google Sign-In script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = initializeGoogleSignIn;
      document.head.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }
  });

  const handleClick = () => {
    if (window.google) {
      setIsLoading(true);
      window.google.accounts.id.prompt();
    } else {
      toast({
        title: "Google Sign-In not available",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-bold flex items-center justify-center gap-2"
      data-testid="google-signin-button"
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isLoading ? 'Signing in...' : `Continue with Google`}
    </Button>
  );
}