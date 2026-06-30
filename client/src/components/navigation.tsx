import { useState } from "react";
import { AlertTriangle, Sparkles, Menu, X } from "lucide-react";
import { usePaymentVerifiedCelebrations } from "@/components/payment-verified-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { AuthChoiceDialog } from "@/components/auth-hover-popup";
import { AccountDrawer } from "@/components/account-drawer";
import { isAuthUserProfileComplete } from "@/lib/account-profile-complete";
import { navigateToHomeSection } from "@/lib/home-navigation";
import { PageContainer } from "@/components/digital-zen/page-container";
import logoPath from "@assets/Logo Transperent TM_1756454893432.png";

interface NavigationProps {
  onBookingClick: () => void;
}

const DRAWER_LINKS = [
  { id: "care", label: "and We", accent: "Care" },
  { id: "vibe", label: "and We", accent: "Vibe" },
  { id: "teach", label: "and We", accent: "Flow" },
  { id: "story", label: "and Our", accent: "Story" },
  { id: "believe", label: "and We", accent: "Believe" },
  { id: "connect", label: "and We", accent: "Connect" },
  { id: "ally", label: "and We Meet", accent: "Yogis" },
] as const;

export default function Navigation({ onBookingClick }: NavigationProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [bookingAuthOpen, setBookingAuthOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { celebrationCount, openCelebrationFromMenu } = usePaymentVerifiedCelebrations();

  const isProfileComplete = isAuthUserProfileComplete(user);

  const goToHomeSection = (sectionId: string) => {
    navigateToHomeSection(sectionId);
    setIsDrawerOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-dz-glass-border bg-white/60 backdrop-blur-[20px]">
        <PageContainer className="flex h-[76px] items-center justify-between gap-4">
          <div className="relative flex-shrink-0">
            <Button
              className="rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-dz-primary hover:bg-primary/90 sm:px-4 sm:text-sm"
              onClick={() => setIsDrawerOpen(true)}
              data-testid="mobile-menu-toggle"
            >
              <Menu className="mr-1.5 h-4 w-4 sm:mr-2" />
              aWY
            </Button>
            {user && celebrationCount > 0 && (
              <button
                type="button"
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-dz-secondary to-primary px-1 text-[10px] font-bold text-white ring-2 ring-white"
                aria-label="Session starting soon — open join prompt"
                data-testid="payment-verified-menu-bubble"
                onClick={(e) => {
                  e.stopPropagation();
                  openCelebrationFromMenu();
                }}
              >
                {celebrationCount > 1 ? celebrationCount : <Sparkles className="h-3 w-3" />}
              </button>
            )}
          </div>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              goToHomeSection("home");
            }}
            className="absolute left-1/2 -translate-x-1/2"
            data-testid="desktop-logo-link"
            aria-label="andWeYoga home"
          >
            <img
              src={logoPath}
              alt="andWeYoga"
              className="h-[clamp(38px,5.5vw,48px)] w-auto hover:opacity-90 transition-opacity"
              data-testid="logo"
            />
          </a>

          <div className="relative flex flex-shrink-0 items-center">
            {authLoading ? (
              // Hold the slot until auth resolves so we never flash the wrong CTA
              // (e.g. "Book Session" before "My Account") on a cold load/refresh.
              <div
                className="h-9 w-[118px] rounded-full bg-primary/10 sm:w-[136px]"
                aria-hidden
                data-testid="nav-auth-loading"
              />
            ) : user ? (
              <Button
                className={`rounded-full px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-dz-primary sm:px-4 sm:text-sm ${
                  !isProfileComplete
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-primary hover:bg-primary/90"
                }`}
                data-testid="nav-my-account"
                onClick={() => setAccountDrawerOpen(true)}
              >
                {!isProfileComplete && <AlertTriangle className="mr-1 h-3 w-3" />}
                My Account
                <Menu className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  className="rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-dz-primary hover:bg-primary/90 sm:px-4 sm:text-sm"
                  data-testid="nav-book-session"
                  onClick={() => setBookingAuthOpen(true)}
                >
                  Book Session
                </Button>
                <AuthChoiceDialog
                  open={bookingAuthOpen}
                  onOpenChange={setBookingAuthOpen}
                  onContinueAsGuest={onBookingClick}
                />
              </>
            )}
          </div>
        </PageContainer>
      </header>

      <div
        className={`fixed inset-0 z-[55] bg-foreground/25 backdrop-blur-[3px] transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsDrawerOpen(false)}
        data-testid="menu-overlay"
      />

      <aside
        className={`fixed left-0 top-0 z-[60] flex h-screen w-[min(320px,86vw)] flex-col gap-1.5 overflow-y-auto border-r border-dz-glass-border bg-white/60 p-5 shadow-2xl backdrop-blur-[24px] transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-primary">Explore</span>
          <Button
            size="sm"
            className="rounded-full bg-primary font-bold text-primary-foreground"
            onClick={() => setIsDrawerOpen(false)}
          >
            <X className="mr-1 h-4 w-4" />
            Close
          </Button>
        </div>
        {DRAWER_LINKS.map((link) => (
          <button
            key={link.id}
            onClick={() => goToHomeSection(link.id)}
            className="rounded-xl px-3.5 py-3 text-left font-display text-base font-semibold text-primary transition-colors hover:bg-primary/5"
            data-testid={`mobile-nav-${link.id}`}
          >
            {link.label}{" "}
            <span className="text-dz-secondary">{link.accent}</span>
          </button>
        ))}
        {user && celebrationCount > 0 && (
          <div className="mt-4 border-t border-dz-glass-border pt-4">
            <Button
              onClick={() => {
                openCelebrationFromMenu();
                setIsDrawerOpen(false);
              }}
              className="w-full rounded-full bg-gradient-to-r from-primary to-dz-secondary font-bold text-white"
              data-testid="mobile-nav-payment-verified"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Join your session
              <Badge className="ml-2 border-0 bg-white/20 text-white">{celebrationCount}</Badge>
            </Button>
          </div>
        )}
      </aside>

      {user && (
        <AccountDrawer open={accountDrawerOpen} onOpenChange={setAccountDrawerOpen} />
      )}
    </>
  );
}
