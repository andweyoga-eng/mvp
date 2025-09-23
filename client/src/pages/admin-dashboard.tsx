import { useQuery } from "@tanstack/react-query";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  UserCheck, 
  UserX, 
  LogOut, 
  Settings, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  healthUpdateText: string | null;
  healthDocumentUrls: string[] | null;
  completeness: {
    isComplete: boolean;
    healthUpdateComplete: boolean;
    documentsComplete: boolean;
    emailVerified: boolean;
    completionPercentage: number;
    flags: string[];
  };
}

interface AdminUsersResponse {
  users: User[];
  totalUsers: number;
  completeProfiles: number;
  incompleteProfiles: number;
}

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!admin) {
    setLocation("/admin/login");
    return null;
  }

  // Fetch users with profile completeness
  const { data: usersData, isLoading, error } = useQuery<AdminUsersResponse>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      
      return response.json();
    },
  });

  const handleLogout = () => {
    logout();
    toast({
      title: "Admin Logged Out",
      description: "You have been successfully logged out.",
    });
    setLocation("/admin/login");
  };

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCompletenessStatus = (user: User) => {
    if (user.completeness.isComplete) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Incomplete</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">andWeYoga Admin</h1>
              <Badge variant="secondary">{admin.role}</Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {admin.name}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                data-testid="button-admin-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {usersData?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complete Profiles</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-complete-profiles">
                {usersData?.completeProfiles || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incomplete Profiles</CardTitle>
              <UserX className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-incomplete-profiles">
                {usersData?.incompleteProfiles || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Monitor user profile completeness and health data compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">Loading users...</span>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load users. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {usersData?.users.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                    data-testid={`user-row-${user.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        {getCompletenessStatus(user)}
                      </div>
                      
                      {user.completeness.flags.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Issues:</p>
                          <div className="flex flex-wrap gap-1">
                            {user.completeness.flags.map((flag, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getCompletenessColor(user.completeness.completionPercentage)}`}
                              style={{ width: `${user.completeness.completionPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {user.completeness.completionPercentage}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {user.completeness.emailVerified && <CheckCircle className="w-3 h-3 text-green-500" />}
                          {user.completeness.healthUpdateComplete && <FileText className="w-3 h-3 text-blue-500" />}
                          {user.completeness.documentsComplete && <Settings className="w-3 h-3 text-purple-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {usersData?.users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No users found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}