import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, User, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Note: Helmet import removed as it's not available in current setup

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { login, admin } = useAdminAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  if (admin) {
    setLocation("/admin/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(formData.email, formData.password);
      toast({
        title: "Admin Login Successful",
        description: `Welcome back, ${formData.email}!`,
      });
      setLocation("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
      toast({
        title: "Admin Login Failed",
        description: err.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-gray-600">
                Administrator access to andWeYoga management system
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" data-testid="error-message">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium">
                    Admin Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="admin@andweyoga.com"
                      required
                      disabled={isLoading}
                      className="pl-10"
                      data-testid="input-admin-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter admin password"
                      required
                      disabled={isLoading}
                      className="pl-10"
                      data-testid="input-admin-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary !text-white font-bold hover:bg-primary/90"
                  data-testid="button-admin-login"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing In...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In to Admin Portal
                    </div>
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-center text-sm text-gray-500">
                  <p>Default Admin Credentials:</p>
                  <p className="font-mono text-xs mt-1">
                    Email: admin@andweyoga.com<br />
                    Password: admin123
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}