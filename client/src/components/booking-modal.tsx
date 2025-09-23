import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, getAuthHeaders } from "@/lib/auth";
import { AuthHoverPopup } from "@/components/auth-hover-popup";
import { AlertTriangle, FileText, User } from "lucide-react";
import type { ClassType, Class } from "@shared/schema";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClassId?: string | null;
}

interface EnrichedClass extends Class {
  classType: ClassType;
  instructor: {
    id: string;
    name: string;
  };
}

export default function BookingModal({ isOpen, onClose, selectedClassId }: BookingModalProps) {
  const [formData, setFormData] = useState({
    classId: selectedClassId || ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Check profile completeness
  const isProfileComplete = user ? 
    user.healthUpdateText && 
    user.healthUpdateText.trim().length >= 10 && 
    user.emailVerified : false;

  const getProfileIssues = () => {
    if (!user) return [];
    const issues = [];
    if (!user.emailVerified) issues.push("Email not verified");
    if (!user.healthUpdateText || user.healthUpdateText.trim().length < 10) {
      issues.push("Health update required (minimum 10 characters)");
    }
    return issues;
  };

  // Fetch class types for dropdown
  const { data: classTypes } = useQuery<ClassType[]>({
    queryKey: ['/api/class-types'],
    enabled: isOpen && !selectedClassId,
  });

  // Fetch all classes for dropdown
  const { data: allClasses } = useQuery<EnrichedClass[]>({
    queryKey: ['/api/classes'],
    enabled: isOpen && !selectedClassId,
  });

  // Fetch specific class if selectedClassId is provided
  const { data: selectedClass } = useQuery<EnrichedClass>({
    queryKey: ['/api/classes', selectedClassId],
    enabled: isOpen && !!selectedClassId,
  });

  useEffect(() => {
    if (selectedClassId) {
      setFormData(prev => ({ ...prev, classId: selectedClassId }));
    }
  }, [selectedClassId]);

  const bookingMutation = useMutation({
    mutationFn: async (data: { classId: string }) => {
      const response = await apiRequest('POST', '/api/bookings', data, getAuthHeaders());
      
      // Check if response is not ok and handle specific error cases
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle profile completeness validation errors (409 status)
        if (response.status === 409 && errorData.requiresHealthUpdate) {
          throw {
            status: 409,
            requiresHealthUpdate: true,
            redirectTo: errorData.redirectTo || '/my-account?tab=health',
            message: errorData.message || 'Health profile required',
            code: errorData.code || 'profile_incomplete'
          };
        }
        
        // Handle other errors
        throw {
          status: response.status,
          message: errorData.message || `Request failed with status ${response.status}`
        };
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking confirmed!",
        description: "You'll receive a confirmation email shortly.",
      });
      setFormData({ classId: '' });
      onClose();
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule/week'] });
    },
    onError: (error: any) => {
      // Handle profile completeness errors specifically
      if (error.status === 409 && error.requiresHealthUpdate) {
        onClose(); // Close booking modal first
        
        toast({
          title: "Profile Incomplete",
          description: "Please complete your health profile to book sessions.",
          variant: "destructive",
        });
        
        // Redirect to profile page with health tab
        setTimeout(() => {
          setLocation(error.redirectTo || '/my-account?tab=health');
        }, 100);
        
        return;
      }
      
      // Handle other errors
      toast({
        title: "Booking failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!user) {
      // For booking modal, we don't need to handle the slideout since hover handles it
      return;
    }
    
    // Preemptive profile completeness check
    if (!isProfileComplete) {
      onClose(); // Close modal first
      
      toast({
        title: "Profile Incomplete",
        description: "Please complete your health profile before booking sessions.",
        variant: "destructive",
      });
      
      // Redirect to profile page with health tab
      setTimeout(() => {
        setLocation('/my-account?tab=health');
      }, 100);
      
      return;
    }
    
    if (!formData.classId) {
      toast({
        title: "Please select a class",
        description: "Class selection is required.",
        variant: "destructive",
      });
      return;
    }
    
    bookingMutation.mutate(formData);
  };

  const handleGoToProfile = () => {
    onClose();
    setLocation('/my-account?tab=health');
  };


  const formatClassOption = (cls: EnrichedClass) => {
    const date = new Date(cls.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    return `${cls.classType.name} - ${dateStr} at ${timeStr} (${cls.currentBookings}/${cls.maxCapacity})`;
  };

  const getAvailableClasses = () => {
    if (!allClasses) return [];
    return allClasses.filter(cls => cls.currentBookings < cls.maxCapacity);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          {/* Profile Incomplete Warning */}
          {user && !isProfileComplete && (
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="space-y-2">
                  <p className="font-medium">Profile Incomplete</p>
                  <div className="text-sm">
                    <p>To book yoga sessions, please complete:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {getProfileIssues().map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    onClick={handleGoToProfile}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 !text-white"
                    data-testid="button-go-to-profile"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Complete Profile
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <DialogHeader>
            <DialogTitle className="text-primary font-bold">Book Your Yoga Session</DialogTitle>
          </DialogHeader>
          
          {!user && !isLoading && (
            <div className="text-center space-y-4">
              <p className="text-purple-600 font-medium">
                Please sign in to book your yoga session
              </p>
              <AuthHoverPopup>
                <Button
                  className="bg-primary !text-white font-bold hover:bg-primary/90"
                  data-testid="show-auth-hover"
                >
                  Sign In / Sign Up
                </Button>
              </AuthHoverPopup>
            </div>
          )}
          
          {user && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-purple-600 font-bold">
                  Booking for: {user.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {selectedClass ? (
                  <div>
                    <Label className="text-sm font-bold text-purple-600">Selected Class</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="font-bold text-purple-600" data-testid="selected-class-name">
                        {selectedClass.classType.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="selected-class-details">
                        {new Date(selectedClass.date).toLocaleDateString()} at{' '}
                        {new Date(selectedClass.date).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        With {selectedClass.instructor.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedClass.currentBookings}/{selectedClass.maxCapacity} spots filled
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="classId" className="text-sm font-bold text-purple-600">
                      Select Class *
                    </Label>
                    <Select value={formData.classId} onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}>
                      <SelectTrigger className="mt-1" data-testid="booking-class-select">
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableClasses().map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {formatClassOption(cls)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 font-bold"
                    data-testid="booking-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary !text-white font-bold hover:bg-primary/90"
                    disabled={bookingMutation.isPending}
                    data-testid="booking-confirm"
                  >
                    {bookingMutation.isPending ? 'Booking...' : 'Book Session'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
    </>
  );
}