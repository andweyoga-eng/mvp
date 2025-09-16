import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}


export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginData.email, loginData.password);
      onClose();
      setLoginData({ email: '', password: '' });
    } catch (error) {
      // Error handled in AuthProvider
    }
  };


  // Google Sign-In handler
  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  // Forgot Password handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Password Reset Email Sent",
          description: data.message || "Check your email for password reset instructions.",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: errorData.message || "Failed to send password reset email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Reset google loading state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGoogleLoading(false);
    }
  }, [isOpen]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center font-bold text-primary">
            Welcome to andWeYoga
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab as any} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="font-bold">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="font-bold">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
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
{googleLoading ? 'Signing in...' : 'Continue with Google'}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-bold">Or continue with email</span>
                </div>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="font-bold text-purple-600">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    data-testid="input-login-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="font-bold text-purple-600">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      data-testid="input-login-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-login-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-purple-600 font-bold hover:text-purple-700"
                    onClick={() => setShowForgotPassword(true)}
                    data-testid="button-forgot-password"
                  >
                    Forgot Password?
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-white font-bold hover:bg-primary/90"
                  data-testid="button-login-submit"
                >
                  Sign In
                </Button>
              </form>
            </div>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
            <div className="space-y-4">
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-bold text-purple-600">Join andWeYoga</h3>
                <p className="text-sm text-purple-500">
                  Sign up with Google to start your yoga journey with us
                </p>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-bold flex items-center justify-center gap-2"
                data-testid="google-signup-button"
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
                {googleLoading ? 'Signing up...' : 'Continue with Google'}
              </Button>
              
              <div className="text-center text-xs text-purple-500 mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Forgot Password Modal */}
    <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold text-purple-600">Reset Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email" className="font-bold text-purple-600">
              Email Address
            </Label>
            <Input
              id="forgot-password-email"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              data-testid="input-forgot-password-email"
            />
            <p className="text-sm text-purple-500">
              We'll send you a link to reset your password
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              className="flex-1"
              data-testid="button-forgot-password-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={forgotPasswordLoading}
              className="flex-1 bg-primary text-white font-bold hover:bg-primary/90"
              data-testid="button-forgot-password-submit"
            >
              {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}