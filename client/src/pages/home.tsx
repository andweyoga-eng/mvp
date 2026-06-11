import Navigation from "@/components/navigation";
import HeroCarousel from "@/components/hero-carousel";
import AllySection from "@/components/ally-section";
import CareSection from "@/components/care-section";
import VibeSection from "@/components/vibe-section";
import BelieveSection from "@/components/believe-section";
import ConnectSection from "@/components/connect-section";
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
import { useState, useEffect, useRef } from "react";

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
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingIntent, setBookingIntent] = useState<BookingIntent>({});
  const [moodCapture, setMoodCapture] = useState<{ phase: MoodPhase; classId: string } | null>(null);
  const resumedBookingRef = useRef(false);

  const handleBookingOpen = (input?: string | BookingIntent) => {
    const intent = normalizeBookingIntent(input);
    setPendingBooking(intent);
    setBookingIntent(intent);
    setIsBookingModalOpen(true);
    setTimeout(() => scrollToBookingSection(intent.scrollTo ?? "schedule"), 100);
  };

  const handleBookingClose = () => {
    setIsBookingModalOpen(false);
    setBookingIntent({});
    clearPendingBooking();
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("openBooking") === "true") {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleBookingOpen({ scrollTo: "schedule" });
    }
  }, []);

  useEffect(() => {
    const capture = parseMoodCaptureFromUrl();
    if (!capture) return;
    setMoodCapture(capture);
    setTimeout(() => scrollToBookingSection("schedule"), 150);
  }, []);

  useEffect(() => {
    if (authLoading || !user || resumedBookingRef.current) return;
    const pending = getPendingBooking();
    if (!pending) return;
    if (!pending.sessionId && !pending.classTypeId && !pending.scrollTo) return;
    resumedBookingRef.current = true;
    setBookingIntent(pending);
    setIsBookingModalOpen(true);
    setTimeout(
      () => scrollToBookingSection(pending.scrollTo ?? (pending.sessionId ? "schedule" : "teach")),
      150,
    );
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 pt-16 md:pt-0">
      <Navigation onBookingClick={() => handleBookingOpen({ scrollTo: "schedule" })} />
      <HeroCarousel />
      <ScheduleSection onBookingClick={(sessionId) => handleBookingOpen(sessionId)} />
      <ClassesSection onBookingClick={(intent) => handleBookingOpen(intent)} />
      <AllySection />
      <CareSection />
      <VibeSection />
      <BelieveSection />
      <ConnectSection />
      <AboutSection />
      <StorySection />
      <ContactSection />
      <Footer />
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleBookingClose}
        sessionId={bookingIntent.sessionId ?? null}
        filterClassTypeId={bookingIntent.classTypeId ?? null}
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
