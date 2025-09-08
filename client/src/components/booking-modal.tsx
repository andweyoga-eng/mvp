import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, getAuthHeaders } from "@/lib/auth";
import { AuthModal } from "@/components/auth-modal";
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
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

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
      setShowAuthModal(true);
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

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // User is now authenticated, proceed with booking
    if (formData.classId) {
      bookingMutation.mutate(formData);
    }
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
          <DialogHeader>
            <DialogTitle className="text-primary font-bold">Book Your Yoga Session</DialogTitle>
          </DialogHeader>
          
          {!user && !isLoading && (
            <div className="text-center space-y-4">
              <p className="text-purple-600 font-medium">
                Please sign in to book your yoga session
              </p>
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-primary text-white font-bold hover:bg-primary/90"
                data-testid="show-auth-modal"
              >
                Sign In / Sign Up
              </Button>
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
                    className="flex-1 bg-primary text-white font-bold hover:bg-primary/90"
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
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        defaultTab="register"
      />
    </>
  );
}