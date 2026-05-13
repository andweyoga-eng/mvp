import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { isAuthUserProfileComplete } from "@/lib/account-profile-complete";
import type { ClassType } from "@shared/schema";

interface ClassesSectionProps {
  onBookingClick: (classTypeId?: string) => void;
}

export default function ClassesSection({ onBookingClick }: ClassesSectionProps) {
  const { data: classTypes, isLoading, error } = useQuery<ClassType[]>({
    queryKey: ['/api/class-types'],
  });

  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isProfileComplete = isAuthUserProfileComplete(user);

  const handleClassBooking = (classTypeId?: string) => {
    if (user && !isProfileComplete) {
      toast({
        title: "Profile Incomplete",
        description: "Please complete your profile (name, mobiles, verified email, and health update) before booking sessions.",
        variant: "destructive",
      });
      setLocation('/my-account');
      return;
    }
    onBookingClick(classTypeId);
  };

  if (error) {
    return (
      <section id="classes" className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-destructive mb-4">
              Unable to Load Classes
            </h2>
            <p className="text-xl text-muted-foreground">
              Please try again later or contact support if the problem persists.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="teach" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">and We Teach</h2>
          <p className="text-xl text-purple-500 max-w-2xl mx-auto">
            Discover the perfect class for your practice level and goals
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden shadow-lg">
                <Skeleton className="w-full h-48" />
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {classTypes?.map((classType) => (
              <Card key={classType.id} className="bg-card rounded-lg overflow-hidden shadow-lg hover-scale">
                <img 
                  src={classType.imageUrl || '/api/placeholder/600/300'} 
                  alt={`${classType.name} class`}
                  className="w-full h-48 object-cover"
                  data-testid={`class-image-${classType.id}`}
                />
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-primary mb-2" data-testid={`class-name-${classType.id}`}>
                    {classType.name}
                  </h3>
                  <p className="text-purple-600 mb-4" data-testid={`class-description-${classType.id}`}>
                    {classType.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-bold" data-testid={`class-price-${classType.id}`}>
                      ₹{classType.price}/session
                    </span>
                    <Button 
                      onClick={() => handleClassBooking(classType.id)}
                      className={`${user && !isProfileComplete ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90'} !text-white px-4 py-2 rounded-full transition-all duration-200 font-bold`}
                      data-testid={`book-button-${classType.id}`}
                    >
                      {user && !isProfileComplete && (
                        <AlertTriangle className="w-4 h-4 mr-2" />
                      )}
                      {user && !isProfileComplete ? 'Complete Profile' : 'Book Now'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && classTypes?.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-2xl font-semibold text-muted-foreground mb-4">
              No classes available at this time
            </h3>
            <p className="text-muted-foreground">
              Please check back later for updated class offerings.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
