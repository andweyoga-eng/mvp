import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getSessionBadgeLabel } from "@/lib/session-badges";
import type { ClassType } from "@shared/schema";
import type { BookingIntent } from "@/lib/pending-booking";

interface ClassesSectionProps {
  onBookingClick: (intent?: BookingIntent) => void;
}

export default function ClassesSection({ onBookingClick }: ClassesSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifyType, setNotifyType] = useState<ClassType | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const { data: classTypes, isLoading, error } = useQuery<ClassType[]>({
    queryKey: ["/api/class-types"],
  });
  const { data: availability } = useQuery<{ classTypeIds: string[] }>({
    queryKey: ["/api/class-types-availability/upcoming"],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const { data: upcomingClasses = [] } = useQuery<Array<{
    classTypeId: string;
    date: string;
    sessionFrequency?: string | null;
    deliveryMode?: string | null;
  }>>({
    queryKey: ["/api/classes"],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const handleClassBooking = (classTypeId: string) => {
    onBookingClick({ classTypeId, scrollTo: "schedule" });
  };

  const hasUpcomingSession = (classTypeId: string) =>
    !!availability?.classTypeIds?.includes(classTypeId);

  const frequencyBadge = (classTypeId: string): string | null => {
    const now = Date.now();
    const row = upcomingClasses
      .filter((c) => c.classTypeId === classTypeId && new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return getSessionBadgeLabel(row?.sessionFrequency, row?.deliveryMode);
  };

  const handleNotifySubmit = async () => {
    if (!notifyType) return;
    const email = user?.email ?? guestEmail.trim();
    if (!email) {
      toast({
        title: "Email required",
        description: "Share your email to get session notifications.",
        variant: "destructive",
      });
      return;
    }
    const res = await fetch(`/api/class-types/${notifyType.id}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      toast({ title: "Could not save notification request", variant: "destructive" });
      return;
    }
    toast({
      title: "You're on the notify list",
      description: "We'll email you when sessions open. Explore other sessions in the meantime.",
    });
    setNotifyType(null);
    setGuestEmail("");
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
                <div className="relative">
                  <img
                    src={classType.imageUrl || "/api/placeholder/600/300"}
                    alt={`${classType.name} class`}
                    className="w-full h-48 object-cover"
                    data-testid={`class-image-${classType.id}`}
                  />
                  {!hasUpcomingSession(classType.id) && (
                    <Badge className="absolute left-2 top-2 bg-amber-600 text-white">
                      Coming Soon
                    </Badge>
                  )}
                  {hasUpcomingSession(classType.id) && frequencyBadge(classType.id) && (
                    <Badge className="absolute right-2 top-2 bg-[#3d1b80] text-white">
                      {frequencyBadge(classType.id)}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-6">
                  <h3
                    className="text-2xl font-bold text-primary mb-2"
                    data-testid={`class-name-${classType.id}`}
                  >
                    {classType.name}
                  </h3>
                  <p className="text-purple-600 mb-4" data-testid={`class-description-${classType.id}`}>
                    {classType.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-bold" data-testid={`class-price-${classType.id}`}>
                      ₹{classType.price}/session
                    </span>
                    {hasUpcomingSession(classType.id) ? (
                      <Button
                        onClick={() => handleClassBooking(classType.id)}
                        className="bg-primary hover:bg-primary/90 !text-white px-4 py-2 rounded-full transition-all duration-200 font-bold"
                        data-testid={`book-button-${classType.id}`}
                      >
                        Book Now
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setNotifyType(classType)}
                        className="bg-[#bb5309] hover:bg-[#9a4508] !text-white px-4 py-2 rounded-full transition-all duration-200 font-bold"
                        data-testid={`notify-button-${classType.id}`}
                      >
                        Notify me
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!notifyType} onOpenChange={(open) => !open && setNotifyType(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Notify me when sessions open</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {notifyType?.name ?? "This session type"} is coming soon. We can notify you as soon
                as a session is scheduled.
              </p>
              {!user && (
                <div className="space-y-2">
                  <Label htmlFor="notify-email">Email</Label>
                  <Input
                    id="notify-email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sign up later to book recurring sessions. Drop-in and trial can be booked as
                    guest sessions.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button className="w-full" onClick={() => void handleNotifySubmit()}>
                  Save notification request
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setNotifyType(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
