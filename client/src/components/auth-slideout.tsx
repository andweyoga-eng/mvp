import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AuthSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthSlideout({ isOpen, onClose }: AuthSlideoutProps) {
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google Sign-In handler
  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  // Reset google loading state when slideout closes
  useEffect(() => {
    if (!isOpen) {
      setGoogleLoading(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Slideout */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-purple-600">Sign Up / Sign In</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              data-testid="button-close-auth"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-8">
              <h3 className="text-lg font-bold text-purple-600 mb-2">Welcome to andWeYoga</h3>
              <p className="text-sm text-purple-500">
                Continue with Google to start your yoga journey
              </p>
            </div>
            
            {/* Google Sign-In Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-bold flex items-center justify-center gap-3 py-3 px-4"
              data-testid="google-signin-button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
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
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>
            
            <div className="text-center text-xs text-purple-500 mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </div>
          </div>
        </div>
      </div>
    </>
  );
}