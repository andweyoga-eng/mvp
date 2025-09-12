import { Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import logoPath from "@assets/Logo Transperent TM_1756454893432.png";

export default function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            {/* Logo hidden on mobile, shown on desktop/tablet */}
            <img 
              src={logoPath} 
              alt="andWeYoga" 
              className="hidden md:block h-8 w-auto mb-4 brightness-0 invert"
              data-testid="footer-logo"
            />
            <p className="text-primary-foreground/80">
              Transform your life through the power of yoga. Join our community today.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => scrollToSection('home')}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  data-testid="footer-link-home"
                >
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('classes')}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  data-testid="footer-link-classes"
                >
                  Classes
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('schedule')}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  data-testid="footer-link-schedule"
                >
                  Schedule
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('about')}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  data-testid="footer-link-about"
                >
                  About
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Classes</h4>
            <ul className="space-y-2">
              <li>
                <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Hatha Yoga
                </button>
              </li>
              <li>
                <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Vinyasa Flow
                </button>
              </li>
              <li>
                <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Power Yoga
                </button>
              </li>
              <li>
                <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Meditation
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <Instagram className="w-6 h-6" data-testid="social-instagram" />
              </button>
              <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <Facebook className="w-6 h-6" data-testid="social-facebook" />
              </button>
              <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <Youtube className="w-6 h-6" data-testid="social-youtube" />
              </button>
              <button className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                <Twitter className="w-6 h-6" data-testid="social-twitter" />
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-primary-foreground/60">
            andWeYO^ga, A brand of Ashtanga Welltech OPC Pvt Ltd. All rights reserved. | Privacy Policy | Terms of Service
          </p>
        </div>
      </div>
    </footer>
  );
}
