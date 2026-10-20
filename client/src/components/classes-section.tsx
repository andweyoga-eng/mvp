import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { getSessionBadgeLabel, SESSION_INFO_BADGE_CLASSNAME } from "@/lib/session-badges";
import { formatProgramListingPriceLabel, type ProgramListingPrice } from "@shared/program-listing-price";
import type { ClassType } from "@shared/schema";
import type { BookingIntent } from "@/lib/pending-booking";
import { collectBookableClassTypeIds } from "@/lib/class-type-availability";
import { PUBLIC_SESSION_CATALOG_QUERY_OPTIONS } from "@/lib/public-session-catalog";
import {
  SessionShareMenu,
  buildClassTypeSharePayloadForUi,
} from "@/components/session-share-menu";
import { StrictNoToBlock } from "@/components/strict-no-to-block";
import { ClampedDescription } from "@/components/clamped-description";
import { ClassTypeCoverImage } from "@/components/class-type-cover-image";
import { WaitlistJoinDialog } from "@/components/waitlist-join-dialog";

interface ClassesSectionProps {
  onBookingClick: (intent?: BookingIntent) => void;
  /** Guests choosing Book Now open sign-in instead of the schedule. */
  onSignInRequest?: () => void;
  /** Open the waitlist for this card (used by a hero CTA). */
  waitlistClassTypeId?: string | null;
  onWaitlistClosed?: () => void;
}

type ListingClassType = ClassType & {
  listingPrice?: ProgramListingPrice | null;
};

export default function ClassesSection({
  onBookingClick,
  onSignInRequest,
  waitlistClassTypeId,
  onWaitlistClosed,
}: ClassesSectionProps) {
  const { user } = useAuth();
  const [waitlistType, setWaitlistType] = useState<ClassType | null>(null);
  const { data: classTypes, isLoading, error } = useQuery<ListingClassType[]>({
    queryKey: ["/api/class-types"],
  });
  const { data: availability } = useQuery<{ classTypeIds: string[] }>({
    queryKey: ["/api/class-types-availability/upcoming"],
    ...PUBLIC_SESSION_CATALOG_QUERY_OPTIONS,
  });
  const { data: upcomingClasses = [] } = useQuery<Array<{
    classTypeId: string;
    date: string;
    duration?: number | null;
    classType?: { duration?: number | null } | null;
    sessionFrequency?: string | null;
    deliveryMode?: string | null;
    status?: string | null;
    pausedAt?: string | null;
    cancelledAt?: string | null;
  }>>({
    queryKey: ["/api/classes"],
    ...PUBLIC_SESSION_CATALOG_QUERY_OPTIONS,
  });

  const bookableClassTypeIds = useMemo(
    () => collectBookableClassTypeIds(upcomingClasses, availability?.classTypeIds),
    [availability?.classTypeIds, upcomingClasses],
  );

  useEffect(() => {
    if (!waitlistClassTypeId) return;
    const match = classTypes?.find((classType) => classType.id === waitlistClassTypeId);
    if (match) setWaitlistType(match);
  }, [waitlistClassTypeId, classTypes]);

  const handleClassBooking = (classTypeId: string) => {
    if (!user && onSignInRequest) {
      onSignInRequest();
      return;
    }
    onBookingClick({ classTypeId, scrollTo: "schedule" });
  };

  const hasUpcomingSession = (classTypeId: string) => bookableClassTypeIds.has(classTypeId);

  const frequencyBadge = (classTypeId: string): string | null => {
    const now = Date.now();
    const row = upcomingClasses
      .filter((c) => c.classTypeId === classTypeId && new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return getSessionBadgeLabel(row?.sessionFrequency, row?.deliveryMode);
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
                <div className="relative overflow-hidden">
                  <ClassTypeCoverImage
                    imageUrl={classType.imageUrl || "/api/placeholder/600/300"}
                    alt={`${classType.name} class`}
                    testId={`class-image-${classType.id}`}
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
                    {user ? (
                      <span className="font-bold text-dz-secondary" data-testid={`class-price-${classType.id}`}>
                        {formatProgramListingPriceLabel(classType.listingPrice) ?? "\u00a0"}
                      </span>
                    ) : (
                      <span aria-hidden className="flex-1" />
                    )}
                    <div className="pointer-events-auto relative z-10 flex items-center gap-2">
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
                        onClick={() => setWaitlistType(classType)}
                        className="rounded-xl bg-dz-secondary px-4 font-semibold text-white hover:bg-dz-secondary/90"
                        data-testid={`waitlist-button-${classType.id}`}
                      >
                        Join Waitlist
                      </Button>
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <WaitlistJoinDialog
          open={!!waitlistType}
          classType={waitlistType}
          onOpenChange={(open) => {
            if (open) return;
            setWaitlistType(null);
            onWaitlistClosed?.();
          }}
        />

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
