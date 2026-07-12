import Navigation from "@/components/navigation";
import HeroCarousel from "@/components/hero-carousel";
import AllySection from "@/components/ally-section";
import CareSection from "@/components/care-section";
import VibeSection from "@/components/vibe-section";
import BelieveSection from "@/components/believe-section";
import ClassesSection from "@/components/classes-section";
import ScheduleSection from "@/components/schedule-section";
import AboutSection from "@/components/about-section";
import StorySection from "@/components/story-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";
import BookingModal from "@/components/booking-modal";
import { MoodCaptureDialog, type MoodPhase } from "@/components/mood-capture-dialog";
import { useAuth } from "@/lib/auth";
import {
  getPendingBooking,
  clearPendingBooking,
  setPendingBooking,
  type BookingIntent,
} from "@/lib/pending-booking";
import { normalizeBookingIntent, scrollToBookingSection } from "@/lib/booking-flow";
import {
  reserveHrefFromIntent,
  resolveMemberLandingPath,
} from "@/lib/member-landing";
import { applyHomeHashScroll } from "@/lib/home-navigation";
import { isAuthUserProfileComplete, getIncompleteAccountHref } from "@/lib/account-profile-complete";
import { fetchMyConsentStatus } from "@/lib/consent-api";
import { setGuestCheckoutToken } from "@/lib/guest-checkout";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

function parseMoodCaptureFromUrl(): { phase: MoodPhase; classId: string } | null {
  const params = new URLSearchParams(window.location.search);
  const mood = params.get("mood");
  const classId = params.get("classId");
  if ((mood === "post" || mood === "pre") && classId) {
    return { phase: mood, classId };
  }
  return null;
}

function clearMoodCaptureUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("mood");
  url.searchParams.delete("classId");
  const hash = url.hash || "#schedule";
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${hash}`);
}

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingIntent, setBookingIntent] = useState<BookingIntent>({});
  const [resumeBookingId, setResumeBookingId] = useState<string | null>(null);
  const [moodCapture, setMoodCapture] = useState<{ phase: MoodPhase; classId: string } | null>(null);
  // null = consent status not yet known; enforced as a first-class Home gate.
  const [consentPending, setConsentPending] = useState<boolean | null>(null);
  const resumedBookingRef = useRef(false);

  const handleBookingOpen = (input?: string | BookingIntent) => {
    const intent = normalizeBookingIntent(input);
    // Signed-in members go straight to the full-page Reserve checkout.
    const href = reserveHrefFromIntent(intent, "home");
    if (user && href) {
      setLocation(href);
      return;
    }
    setPendingBooking(intent);
    setBookingIntent(intent);
    setIsBookingModalOpen(true);
    setTimeout(() => scrollToBookingSection(intent.scrollTo ?? "schedule"), 100);
  };

  const handleBookingClose = () => {
    setIsBookingModalOpen(false);
    setBookingIntent({});
    setResumeBookingId(null);
    const pending = getPendingBooking();
    if (!pending?.sessionId && !pending?.classTypeId) {
      clearPendingBooking();
    }
  };

  // Consent is the first gate: no one reaches the marketing home until it's done.
  // Fetch it for every signed-in member so a completed profile with pending
  // consent still gets routed to My Account → Privacy.
  useEffect(() => {
    if (authLoading || !user) {
      setConsentPending(null);
      return;
    }
    let cancelled = false;
    setConsentPending(null);
    fetchMyConsentStatus()
      .then((status) => {
        if (!cancelled) setConsentPending(Boolean(status.requirement?.requiresConsent));
      })
      .catch(() => {
        // Fail open on a transient error so members aren't locked out of Home.
        if (!cancelled) setConsentPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  // A signed-in member who never finished onboarding (contact, health, or
  // consent) shouldn't see the marketing home — send them straight to the exact
  // My Account section they left off at.
  const incompleteAccountHref =
    !authLoading && user
      ? getIncompleteAccountHref(user, { requiresConsent: consentPending === true })
      : null;

  // Profile is done but we don't yet know consent status — hold the render so we
  // never flash the carousel to someone who still owes consent.
  const awaitingConsentGate =
    !authLoading &&
    !!user &&
    consentPending === null &&
    !getIncompleteAccountHref(user);

  useEffect(() => {
    if (incompleteAccountHref) {
      setLocation(incompleteAccountHref);
    }
  }, [incompleteAccountHref, setLocation]);

  useEffect(() => {
    applyHomeHashScroll();
    const onHashChange = () => applyHomeHashScroll();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resumeId = urlParams.get("resumeBookingId");
    const guestToken = urlParams.get("guestCheckoutToken");

    if (resumeId && guestToken) {
      setGuestCheckoutToken(guestToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("resumeBookingId");
      url.searchParams.delete("guestCheckoutToken");
      url.searchParams.delete("openBooking");
      window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}${url.hash || ""}`,
      );
      setResumeBookingId(resumeId);
      setIsBookingModalOpen(true);
      setTimeout(() => scrollToBookingSection("schedule"), 100);
      return;
    }

    if (urlParams.get("openBooking") === "true") {
      const sessionId = urlParams.get("sessionId");
      const classTypeId = urlParams.get("classTypeId");
      window.history.replaceState({}, document.title, window.location.pathname);
      handleBookingOpen({
        scrollTo: classTypeId ? "teach" : "schedule",
        ...(sessionId ? { sessionId } : {}),
        ...(classTypeId ? { classTypeId } : {}),
      });
    }
  }, []);

  useEffect(() => {
    const capture = parseMoodCaptureFromUrl();
    if (!capture) return;
    setMoodCapture(capture);
    setTimeout(() => scrollToBookingSection("schedule"), 150);
  }, []);

  useEffect(() => {
    if (authLoading || resumedBookingRef.current) return;
    const pending = getPendingBooking();
    if (!pending) return;
    if (!pending.sessionId && !pending.classTypeId && !pending.scrollTo) return;

    if (user) {
      resumedBookingRef.current = true;
      const href = reserveHrefFromIntent(pending, "home");
      if (href && isAuthUserProfileComplete(user)) {
        setLocation(href);
        return;
      }
      if (href && !isAuthUserProfileComplete(user)) {
        setLocation(resolveMemberLandingPath(user));
        return;
      }
      setBookingIntent(pending);
      setIsBookingModalOpen(true);
      setTimeout(
        () => scrollToBookingSection(pending.scrollTo ?? (pending.sessionId ? "schedule" : "teach")),
        150,
      );
      return;
    }

    if (pending.sessionId || pending.classTypeId) {
      resumedBookingRef.current = true;
      setBookingIntent(pending);
      setIsBookingModalOpen(true);
      setTimeout(
        () => scrollToBookingSection(pending.scrollTo ?? (pending.sessionId ? "schedule" : "teach")),
        150,
      );
    }
  }, [user, authLoading, setLocation]);

  // While the redirect above is in flight (or we're still confirming consent),
  // don't flash the carousel/home content.
  if (incompleteAccountHref || awaitingConsentGate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dz-surface pb-24 md:pb-0">
      <Navigation onBookingClick={() => handleBookingOpen({ scrollTo: "schedule" })} />
      <HeroCarousel />
      <ScheduleSection onBookingClick={(sessionId) => handleBookingOpen(sessionId)} />
      <ClassesSection onBookingClick={(intent) => handleBookingOpen(intent)} />
      <CareSection />
      <VibeSection />
      <BelieveSection />
      <AboutSection />
      <StorySection />
      <AllySection />
      <ContactSection />
      <Footer />
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleBookingClose}
        sessionId={bookingIntent.sessionId ?? null}
        filterClassTypeId={bookingIntent.classTypeId ?? null}
        resumeBookingId={resumeBookingId}
      />
      {moodCapture && (
        <MoodCaptureDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setMoodCapture(null);
              clearMoodCaptureUrl();
            }
          }}
          classId={moodCapture.classId}
          phase={moodCapture.phase}
          onComplete={() => {
            setMoodCapture(null);
            clearMoodCaptureUrl();
          }}
        />
      )}
    </div>
  );
}
