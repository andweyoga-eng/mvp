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
import { getSessionBadgeLabel, SESSION_INFO_BADGE_CLASSNAME } from "@/lib/session-badges";
import type { ClassType } from "@shared/schema";
import type { BookingIntent } from "@/lib/pending-booking";
import {
  SessionShareMenu,
  buildClassTypeSharePayloadForUi,
} from "@/components/session-share-menu";
import { StrictNoToBlock } from "@/components/strict-no-to-block";
import { ClampedDescription } from "@/components/clamped-description";

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
    <section id="teach" className="bg-[#f4f1f8] py-16 md:py-20">
      <div className="mx-auto w-full max-w-dz px-[clamp(1rem,4vw,1.5rem)]">
        <div className="mb-10 text-center md:mb-12">
          <h2 className="font-display text-[clamp(1.875rem,5vw,3.25rem)] font-bold tracking-tight text-primary">
            and We <span className="font-accent italic font-normal text-dz-secondary">Flow</span>
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-dz-muted">
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 md:gap-7">
            {classTypes?.map((classType) => (
              <Card
                key={classType.id}
                className="overflow-hidden rounded-[22px] border border-dz-glass-border bg-white shadow-dz-ambient transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative">
                  <img
                    src={classType.imageUrl || "/api/placeholder/600/300"}
                    alt={`${classType.name} class`}
                    className="w-full h-48 object-cover"
                    data-testid={`class-image-${classType.id}`}
                  />
                  {!hasUpcomingSession(classType.id) && (
                    <Badge className="absolute left-3 top-3 bg-dz-secondary text-white">
                      Coming Soon
                    </Badge>
                  )}
                  {hasUpcomingSession(classType.id) && frequencyBadge(classType.id) && (
                    <Badge
                      variant="outline"
                      className={`absolute right-3 top-3 ${SESSION_INFO_BADGE_CLASSNAME} bg-white/95 backdrop-blur-sm`}
                    >
                      {frequencyBadge(classType.id)}
                    </Badge>
                  )}
                </div>
                <CardContent className="flex flex-1 flex-col p-6">
                  <h3
                    className="mb-2 font-display text-2xl font-bold text-primary"
                    data-testid={`class-name-${classType.id}`}
                  >
                    {classType.name}
                  </h3>
                  <ClampedDescription
                    text={classType.description}
                    className="mb-4 flex-1"
                    testId={`class-description-${classType.id}`}
                  />
                  <StrictNoToBlock strictNoTo={classType.strictNoTo} compact className="mb-4 border-none pt-0" />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-bold text-dz-secondary" data-testid={`class-price-${classType.id}`}>
                      ₹{classType.price}/session
                    </span>
                    <div className="flex items-center gap-2">
                      <SessionShareMenu
                        payload={buildClassTypeSharePayloadForUi(classType)}
                        className="rounded-xl h-9 text-xs"
                        variant="outline"
                      />
                    {hasUpcomingSession(classType.id) ? (
                      <Button
                        onClick={() => handleClassBooking(classType.id)}
                        className="rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-dz-primary hover:bg-primary/90"
                        data-testid={`book-button-${classType.id}`}
                      >
                        Book Now
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setNotifyType(classType)}
                        className="rounded-xl bg-dz-secondary px-4 font-semibold text-white hover:bg-dz-secondary/90"
                        data-testid={`notify-button-${classType.id}`}
                      >
                        Notify me
                      </Button>
                    )}
                    </div>
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
