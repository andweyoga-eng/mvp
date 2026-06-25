import { Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import { PageContainer } from "@/components/digital-zen/page-container";
import { navigateToHomeSection } from "@/lib/home-navigation";

export default function Footer() {
  return (
    <footer className="bg-primary py-10 text-primary-foreground md:py-16">
      <PageContainer>
        <div className="grid grid-cols-1 gap-8 border-b border-white/15 pb-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3.5 font-display text-xl font-extrabold">
              <span className="text-white">andWe</span>
              <span className="text-[#cbb6ff]">YO</span>
              <span className="text-[#fdb98a]">^</span>
              <span className="text-[#cbb6ff]">ga</span>
            </div>
            <p className="text-sm leading-relaxed text-white/72">
              Transform your life through the power of yoga. Join our community today.
            </p>
          </div>
          <div>
            <h5 className="mb-3.5 font-display text-sm font-semibold">Quick Links</h5>
            <div className="flex flex-col gap-2.5">
              {[
                { id: "home", label: "Home" },
                { id: "teach", label: "Classes" },
                { id: "schedule", label: "Schedule" },
                { id: "about", label: "About" },
              ].map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => navigateToHomeSection(link.id)}
                  className="text-left text-sm text-white/72 transition hover:text-white"
                  data-testid={`footer-link-${link.id}`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h5 className="mb-3.5 font-display text-sm font-semibold">Classes</h5>
            <div className="flex flex-col gap-2.5 text-sm text-white/72">
              <span>Hatha Yoga</span>
              <span>Vinyasa Flow</span>
              <span>Power Yoga</span>
              <span>Meditation</span>
            </div>
          </div>
          <div>
            <h5 className="mb-3.5 font-display text-sm font-semibold">Follow Us</h5>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/andweyoga/" target="_blank" rel="noopener noreferrer" className="text-white/72 hover:text-white">
                <Instagram className="h-6 w-6" data-testid="social-instagram" />
              </a>
              <button type="button" className="text-white/72 hover:text-white">
                <Facebook className="h-6 w-6" data-testid="social-facebook" />
              </button>
              <button type="button" className="text-white/72 hover:text-white">
                <Youtube className="h-6 w-6" data-testid="social-youtube" />
              </button>
              <button type="button" className="text-white/72 hover:text-white">
                <Twitter className="h-6 w-6" data-testid="social-twitter" />
              </button>
            </div>
          </div>
        </div>
        <p className="mt-7 text-center text-sm text-white/60">
          andWeYO^ga, A brand of Ashtanga Welltech OPC Pvt Ltd. All rights reserved. | Privacy
          Policy | Terms of Service
        </p>
      </PageContainer>
    </footer>
  );
}
