import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  MapPin,
  User as UserIcon,
  Lock,
  CheckCircle2,
  CreditCard,
  Loader2,
  Flower2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/digital-zen/page-container";
import { GlassCard } from "@/components/digital-zen/glass-card";
import { formatSessionPrice, isValidPaymentUrl } from "@/lib/booking-payment";
import { filterBookableSessions, sessionDurationMinutes } from "@/lib/booking-flow";
import { isAuthUserProfileComplete } from "@/lib/account-profile-complete";
import { isTrialOrDropIn } from "@shared/booking-eligibility";
import {
  fetchMemberSessions,
  memberSessionsQueryKey,
  findUpcomingMemberSessionForClass,
} from "@/lib/member-sessions";
import { setPendingBooking } from "@/lib/pending-booking";
import { useBookingCheckout } from "@/hooks/use-booking-checkout";
import {
  ManualPaymentReferenceBlock,
  ManualPaymentSubmittedMessage,
} from "@/components/manual-payment-reference-block";
import { PaymentConfirmedContent } from "@/components/payment-confirmed-dialog";
import { AlreadyBookedSessionContent } from "@/components/already-booked-session-content";
import logoPath from "@assets/Logo Transperent TM_1756454893432.png";
import type { Class, ClassType } from "@shared/schema";

interface EnrichedClass extends Class {
  classType: ClassType;
  instructor: { id: string; name: string };
  hasPaymentConfigured?: boolean;
}

const MY_SESSIONS_URL = "/my-account#sessions";

function dayKey(date: string | Date): string {
  return new Date(date).toDateString();
}

function formatDow(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function formatDayNum(date: string | Date): string {
  return String(new Date(date).getDate());
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatLongDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Reserve() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const params = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    [],
  );
  const sessionId = params.get("sessionId");
  const classTypeId = params.get("classTypeId");

  const checkout = useBookingCheckout({
    onProfileRequired: (redirectTo) => setLocation(redirectTo),
  });

  // Redirect guests to the home booking modal (keeps the guest/trial path intact).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPendingBooking({
        sessionId: sessionId ?? undefined,
        classTypeId: classTypeId ?? undefined,
        scrollTo: sessionId ? "schedule" : "teach",
      });
      setLocation("/");
    }
  }, [user, authLoading, sessionId, classTypeId, setLocation]);

  const { data: allClasses = [], isLoading: classesLoading } = useQuery<EnrichedClass[]>({
    queryKey: ["/api/classes"],
  });

  const { data: singleClass } = useQuery<EnrichedClass>({
    queryKey: ["/api/classes", sessionId],
    enabled: !!sessionId,
    retry: 1,
  });

  const { data: memberSessions = [] } = useQuery({
    queryKey: memberSessionsQueryKey(user?.id ?? ""),
    queryFn: fetchMemberSessions,
    enabled: !!user?.id,
  });

  // Pool of sessions the member can pick a date/time from.
  const pool = useMemo<EnrichedClass[]>(() => {
    const bookable = filterBookableSessions(allClasses);
    if (classTypeId) {
      return bookable.filter(
        (c) => c.classType?.id === classTypeId || c.classTypeId === classTypeId,
      );
    }
    if (sessionId) {
      const found =
        bookable.find((c) => c.id === sessionId) ??
        (singleClass?.id === sessionId ? singleClass : undefined);
      // Offer sibling sessions of the same type as alternate date/times.
      const typeId = found?.classType?.id ?? found?.classTypeId;
      const siblings = typeId
        ? bookable.filter((c) => (c.classType?.id ?? c.classTypeId) === typeId)
        : [];
      const merged = found ? [found, ...siblings.filter((s) => s.id !== found.id)] : siblings;
      return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return bookable;
  }, [allClasses, classTypeId, sessionId, singleClass]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-populate the date/time/session from the navigation origin.
  useEffect(() => {
    if (selectedId || pool.length === 0) return;
    if (sessionId && pool.some((c) => c.id === sessionId)) {
      setSelectedId(sessionId);
    } else {
      setSelectedId(pool[0].id);
    }
  }, [pool, sessionId, selectedId]);

  const selected = useMemo(
    () => pool.find((c) => c.id === selectedId) ?? null,
    [pool, selectedId],
  );

  const dayGroups = useMemo(() => {
    const map = new Map<string, EnrichedClass[]>();
    for (const c of pool) {
      const k = dayKey(c.date);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return Array.from(map.entries()).map(([key, sessions]) => ({
      key,
      date: sessions[0].date,
      sessions: sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }));
  }, [pool]);

  const selectedDayKey = selected ? dayKey(selected.date) : null;
  const timesForSelectedDay = useMemo(
    () => dayGroups.find((g) => g.key === selectedDayKey)?.sessions ?? [],
    [dayGroups, selectedDayKey],
  );

  const existingBooking = selected
    ? findUpcomingMemberSessionForClass(memberSessions, selected.id)
    : undefined;

  const price = selected ? formatSessionPrice(selected.classType.price) : null;
  const profileComplete = isAuthUserProfileComplete(user);
  const isTrialDrop = isTrialOrDropIn(selected?.sessionFrequency ?? null);

  const handleConfirm = () => {
    if (!selected) return;
    if (user && !profileComplete && !isTrialDrop) {
      toast({
        title: "Profile incomplete",
        description: "Complete your profile and health update before booking.",
        variant: "destructive",
      });
      setLocation("/my-account#profile");
      return;
    }
    checkout.startBooking(selected.id);
  };

  const goToSessions = () => setLocation(MY_SESSIONS_URL);

  const reserved = checkout.paymentResult;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-dz-surface text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed -right-[10%] -top-[12%] z-0 h-[600px] w-[600px] rounded-full bg-primary/[0.06] blur-[80px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-[8%] -left-[8%] z-0 h-[460px] w-[460px] rounded-full bg-dz-secondary/[0.05] blur-[80px]"
      />

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-dz-glass-border bg-dz-surface/80 backdrop-blur-[20px]">
        <PageContainer className="flex h-[76px] items-center justify-between gap-4">
          <button type="button" onClick={() => setLocation("/dashboard")} aria-label="andWeYoga dashboard">
            <img src={logoPath} alt="andWeYoga" className="h-[clamp(38px,5.5vw,48px)] w-auto" />
          </button>
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Sessions</span>
          </button>
        </PageContainer>
      </header>

      <main className="relative z-[1]">
        <PageContainer className="max-w-[1100px] py-[clamp(24px,4vw,44px)] pb-24">
          <div className="mb-7">
            <span className="mb-3.5 inline-block rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
              Confirm Your Booking
            </span>
            <h1 className="font-display text-[clamp(28px,4vw,40px)] font-bold tracking-tight text-primary">
              Reserve your <span className="font-accent text-[1.1em] italic">spot</span>
            </h1>
          </div>

          {classesLoading && !selected ? (
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex-[3_1_480px] space-y-6">
                <Skeleton className="h-[180px] w-full rounded-[22px]" />
                <Skeleton className="h-[120px] w-full rounded-[22px]" />
              </div>
              <Skeleton className="h-[320px] flex-[1_1_300px] rounded-[22px]" />
            </div>
          ) : !selected ? (
            <GlassCard className="p-10 text-center">
              <p className="text-muted-foreground">
                This session is no longer open for booking.
              </p>
              <Button className="mt-5" onClick={() => (window.location.href = "/#schedule")}>
                Browse the schedule
              </Button>
            </GlassCard>
          ) : (
            <div className="flex flex-wrap items-start gap-6">
              {/* LEFT */}
              <div className="flex flex-[3_1_480px] flex-col gap-6">
                {/* session summary */}
                <GlassCard className="flex flex-wrap overflow-hidden rounded-[22px]">
                  <div className="relative flex min-h-[180px] flex-[1_1_200px] items-center justify-center bg-gradient-to-br from-[#d7cfe6] to-[#c8bdd9]">
                    {selected.classType.imageUrl ? (
                      <img
                        src={selected.classType.imageUrl}
                        alt={selected.classType.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Flower2 className="h-[72px] w-[72px] text-primary/25" />
                    )}
                  </div>
                  <div className="flex flex-[1_1_260px] flex-col justify-center gap-4 p-6">
                    <div>
                      <h2 className="font-display text-2xl font-semibold text-primary">
                        {selected.classType.name}
                      </h2>
                      {selected.classType.description ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {selected.classType.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3.5">
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <Clock className="h-[18px] w-[18px] text-primary" />
                        {sessionDurationMinutes(selected)} min
                      </span>
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <UserIcon className="h-[18px] w-[18px] text-primary" />
                        {selected.instructor.name}
                      </span>
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <MapPin className="h-[18px] w-[18px] text-primary" />
                        Online (Google Meet)
                      </span>
                    </div>
                  </div>
                </GlassCard>

                {/* date */}
                {dayGroups.length > 1 && (
                  <GlassCard className="rounded-[22px] p-6">
                    <h3 className="mb-4 font-display text-lg font-semibold">Select a date</h3>
                    <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {dayGroups.map((g) => {
                        const active = g.key === selectedDayKey;
                        return (
                          <button
                            key={g.key}
                            type="button"
                            onClick={() => setSelectedId(g.sessions[0].id)}
                            className={cn(
                              "min-w-[64px] flex-shrink-0 rounded-[14px] px-4 py-3 text-center transition-colors",
                              active
                                ? "bg-primary text-primary-foreground shadow-dz-primary"
                                : "border border-transparent bg-black/[0.04] text-foreground hover:border-primary/20 hover:bg-white",
                            )}
                          >
                            <div
                              className={cn(
                                "text-[11px] font-semibold",
                                active ? "opacity-85" : "text-muted-foreground",
                              )}
                            >
                              {formatDow(g.date)}
                            </div>
                            <div className="mt-0.5 font-display text-xl font-bold">
                              {formatDayNum(g.date)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

                {/* time */}
                {timesForSelectedDay.length > 1 && (
                  <GlassCard className="rounded-[22px] p-6">
                    <h3 className="mb-4 font-display text-lg font-semibold">Choose a time</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {timesForSelectedDay.map((s) => {
                        const active = s.id === selectedId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedId(s.id)}
                            className={cn(
                              "rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors",
                              active
                                ? "bg-primary text-primary-foreground shadow-dz-primary"
                                : "border border-transparent bg-black/[0.04] text-muted-foreground hover:border-primary/20 hover:bg-white",
                            )}
                          >
                            {formatTime(s.date)}
                          </button>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}
              </div>

              {/* RIGHT */}
              <div className="flex-[1_1_300px] lg:sticky lg:top-[96px]">
                <GlassCard className="rounded-[22px] p-6">
                  <h3 className="mb-[18px] font-display text-lg font-semibold">Booking summary</h3>
                  <div className="flex flex-col gap-3 border-b border-primary/10 pb-[18px]">
                    <SummaryRow label="Session" value={selected.classType.name} />
                    <SummaryRow label="Date" value={formatLongDate(selected.date)} />
                    <SummaryRow label="Time" value={formatTime(selected.date)} />
                    <SummaryRow label="Instructor" value={selected.instructor.name} />
                  </div>
                  <div className="flex items-baseline justify-between py-[18px]">
                    <span className="text-[15px] font-semibold">Total</span>
                    <span className="font-display text-[26px] font-bold text-primary">
                      {price ?? "N/A"}
                    </span>
                  </div>

                  {/* ===== CHECKOUT STATE MACHINE ===== */}
                  {checkout.processingCopy && (
                    <Alert className="mb-3 border-amber-300 bg-amber-50">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                      <AlertDescription className="text-amber-950">
                        <p className="font-semibold">{checkout.processingCopy.title}</p>
                        <p className="mt-1 text-sm">{checkout.processingCopy.description}</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {existingBooking && checkout.step === "idle" ? (
                    <AlreadyBookedSessionContent
                      className={existingBooking.className}
                      instructorName={existingBooking.instructorName}
                      sessionDate={existingBooking.date}
                      onViewSessions={goToSessions}
                      onCancel={() => setLocation("/dashboard")}
                    />
                  ) : checkout.step === "payment-confirmed" && checkout.paymentOutcome ? (
                    <PaymentConfirmedContent
                      details={{
                        bookingId: checkout.paymentOutcome.bookingId,
                        className: checkout.paymentOutcome.className,
                        instructorName: checkout.paymentOutcome.instructorName,
                        sessionDate: checkout.paymentOutcome.sessionDate,
                      }}
                      onViewSessions={goToSessions}
                      onCancel={() => setLocation("/dashboard")}
                    />
                  ) : checkout.step === "manual-submitted" ? (
                    <ManualPaymentSubmittedMessage onViewSessions={goToSessions} />
                  ) : checkout.step === "already-booked" ? (
                    <div className="space-y-3">
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertDescription className="text-amber-950">
                          You have already booked this session.
                        </AlertDescription>
                      </Alert>
                      <Button className="w-full" onClick={goToSessions}>
                        View My Sessions
                      </Button>
                    </div>
                  ) : checkout.step === "failed" ? (
                    <div className="space-y-3">
                      <Alert variant="destructive">
                        <AlertDescription>
                          Payment did not complete. Your spot is reserved. Retry to confirm.
                        </AlertDescription>
                      </Alert>
                      <Button
                        className="w-full bg-green-600 !text-white hover:bg-green-700"
                        disabled={checkout.isPaying}
                        onClick={checkout.retryPayment}
                      >
                        {checkout.isPaying ? "Opening…" : "Retry payment"}
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => setLocation("/dashboard")}>
                        Cancel
                      </Button>
                    </div>
                  ) : checkout.step === "pay" && reserved ? (
                    <div className="space-y-3">
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-700" />
                        <AlertDescription className="text-green-900">
                          Your spot is reserved. Complete payment to confirm.
                        </AlertDescription>
                      </Alert>

                      {reserved.useQrPayment && reserved.qrPayment && reserved.bookingId ? (
                        <ManualPaymentReferenceBlock
                          variant="qr"
                          bookingId={reserved.bookingId}
                          qrPayment={reserved.qrPayment}
                          onSubmitted={checkout.markManualSubmitted}
                        />
                      ) : !reserved.useQrPayment &&
                        isValidPaymentUrl(reserved.razorpayLink) &&
                        reserved.bookingId ? (
                        <ManualPaymentReferenceBlock
                          variant="payment_link"
                          bookingId={reserved.bookingId}
                          paymentLink={reserved.razorpayLink}
                          onSubmitted={checkout.markManualSubmitted}
                        />
                      ) : reserved.useRazorpayCheckout ? (
                        <Button
                          className="w-full bg-green-600 !text-white hover:bg-green-700"
                          disabled={checkout.isPaying || !!checkout.paymentPhase}
                          onClick={() => void checkout.startRazorpayCheckout(reserved)}
                        >
                          {checkout.isPaying
                            ? "Payment in progress…"
                            : `Pay ${price ?? "now"}`}
                        </Button>
                      ) : null}
                      <Button variant="outline" className="w-full" onClick={() => setLocation("/dashboard")}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      {selected.hasPaymentConfigured === false && (
                        <Alert className="mb-3 border-amber-200 bg-amber-50">
                          <AlertDescription className="text-xs text-amber-900">
                            Payment isn't configured for this session yet. Please choose another time.
                          </AlertDescription>
                        </Alert>
                      )}
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={checkout.isReserving || selected.hasPaymentConfigured === false}
                        className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary py-[15px] text-[15px] font-bold text-primary-foreground shadow-dz-primary transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        data-testid="reserve-confirm"
                      >
                        <Lock className="h-5 w-5" />
                        {checkout.isReserving ? "Reserving…" : "Confirm & Reserve"}
                      </button>
                      <p className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="h-4 w-4 text-[#354c3a]" />
                        {selected.paymentMethod === "qr"
                          ? "Pay by scanning the studio QR after reserving."
                          : "Secure payment via Razorpay after reserving."}
                      </p>
                    </>
                  )}
                </GlassCard>
              </div>
            </div>
          )}
        </PageContainer>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}
