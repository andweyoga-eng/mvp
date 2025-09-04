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
import { useState } from "react";

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
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
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
