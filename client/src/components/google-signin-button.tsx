import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GoogleLogo } from '@/components/google-logo';
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
  const { toast } = useToast();

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const result = await apiRequest('POST', '/api/auth/google-signin', {
        token: response.credential
      });
      
      if (result.ok) {
        const data = await result.json();
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
      <GoogleLogo />
      {isLoading ? 'Signing in...' : `Continue with Google`}
    </Button>
  );
}