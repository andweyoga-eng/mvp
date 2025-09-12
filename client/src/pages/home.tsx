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
import { useState, useEffect } from "react";

export default function Home() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const handleBookingOpen = (classId?: string) => {
    setSelectedClassId(classId || null);
    setIsBookingModalOpen(true);
  };

  const handleBookingClose = () => {
    setIsBookingModalOpen(false);
    setSelectedClassId(null);
  };

  const scrollToSchedule = () => {
    const element = document.getElementById('schedule');
    if (element) {
      // Calculate offset to account for navigation header and ensure no hero carousel is visible
      const headerHeight = window.innerWidth >= 768 ? 120 : 100; // Increased offset to eliminate hero carousel
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Handle automatic scroll to schedule when coming from My Account page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openBooking') === 'true') {
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Scroll to schedule section after a brief delay to ensure DOM is ready
      setTimeout(() => {
        scrollToSchedule();
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navigation onBookingClick={scrollToSchedule} />
      <HeroCarousel onBookingClick={scrollToSchedule} />
      <ScheduleSection onBookingClick={handleBookingOpen} />
      <AllySection />
      <CareSection />
      <VibeSection />
      <BelieveSection />
      <ClassesSection onBookingClick={handleBookingOpen} />
      <AboutSection />
      <StorySection />
      <ContactSection />
      <Footer />
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={handleBookingClose}
        selectedClassId={selectedClassId}
      />
    </div>
  );
}
