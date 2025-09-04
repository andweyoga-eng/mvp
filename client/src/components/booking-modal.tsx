import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ClassType, Class, InsertBooking } from "@shared/schema";

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
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    classId: selectedClassId || ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    mutationFn: async (data: InsertBooking) => {
      const response = await apiRequest('POST', '/api/bookings', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking confirmed!",
        description: "You'll receive a confirmation email shortly.",
      });
      setFormData({ customerName: '', customerEmail: '', customerPhone: '', classId: '' });
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
    if (!formData.customerName || !formData.customerEmail || !formData.classId) {
      toast({
        title: "Please fill in all required fields",
        description: "Name, email, and class selection are required.",
        variant: "destructive",
      });
      return;
    }
    bookingMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Book Your Yoga Session</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customerName" className="text-sm font-medium text-foreground">
              Full Name *
            </Label>
            <Input
              id="customerName"
              name="customerName"
              type="text"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="Your full name"
              className="mt-1"
              data-testid="booking-name"
              required
            />
          </div>

          <div>
            <Label htmlFor="customerEmail" className="text-sm font-medium text-foreground">
              Email Address *
            </Label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              className="mt-1"
              data-testid="booking-email"
              required
            />
          </div>

          <div>
            <Label htmlFor="customerPhone" className="text-sm font-medium text-foreground">
              Phone Number
            </Label>
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              value={formData.customerPhone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
              className="mt-1"
              data-testid="booking-phone"
            />
          </div>

          {selectedClass ? (
            <div>
              <Label className="text-sm font-medium text-foreground">Selected Class</Label>
              <div className="mt-1 p-3 bg-muted rounded-md">
                <p className="font-medium" data-testid="selected-class-name">
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
              <Label htmlFor="classId" className="text-sm font-medium text-foreground">
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
              className="flex-1"
              data-testid="booking-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={bookingMutation.isPending}
              data-testid="booking-confirm"
            >
              {bookingMutation.isPending ? 'Booking...' : 'Book Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
