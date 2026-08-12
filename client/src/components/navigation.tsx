import { useState, useEffect } from "react";
import { AlertTriangle, Sparkles, Menu, X } from "lucide-react";
import { usePaymentVerifiedCelebrations } from "@/components/payment-verified-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { AuthChoiceDialog } from "@/components/auth-hover-popup";
import { AccountDrawer } from "@/components/account-drawer";
import {
  getIncompleteAccountHref,
  isAuthUserProfileComplete,
} from "@/lib/account-profile-complete";
import { navigateToHomeSection } from "@/lib/home-navigation";
import { BrandLogo } from "@/components/brand-logo";
import { AccountMenuDrawerButton } from "@/components/account-menu-controls";
import { PageContainer } from "@/components/digital-zen/page-container";
import { cn } from "@/lib/utils";

interface NavigationProps {
  onBookingClick: () => void;
  /** Home landing: chrome-free over hero; sticky header returns after scroll. */
  overlayHero?: boolean;
}

const DRAWER_LINKS = [
  { id: "care", label: "and We", accent: "Care" },
  { id: "vibe", label: "and We", accent: "Vibe" },
  { id: "teach", label: "and We", accent: "Workout" },
  { id: "story", label: "and Our", accent: "Story" },
  { id: "believe", label: "and We", accent: "Believe" },
  { id: "ally", label: "and We Meet", accent: "Coach" },
] as const;

/** Logo asset is 360×112 — 56 CSS px is max crisp height on 2× displays. */
const NAV_LOGO_CLASS = "h-14 w-auto max-h-[112px]";

export default function Navigation({ onBookingClick, overlayHero = false }: NavigationProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [bookingAuthOpen, setBookingAuthOpen] = useState(false);
  const [pastHero, setPastHero] = useState(!overlayHero);
  const { user, isLoading: authLoading } = useAuth();
  const { celebrationCount, openCelebrationFromMenu } = usePaymentVerifiedCelebrations();

  const isProfileComplete = isAuthUserProfileComplete(user);
  const chromeFree = overlayHero && !pastHero;
  const showBurger = !overlayHero || pastHero;

  useEffect(() => {
    if (!overlayHero) {
      setPastHero(true);
      return;
    }

    const update = () => {
      const hero = document.getElementById("home");
      if (!hero) {
        setPastHero(true);
        return;
      }
      setPastHero(window.scrollY >= hero.offsetHeight);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [overlayHero]);

  const goToHomeSection = (sectionId: string) => {
    navigateToHomeSection(sectionId);
    setIsDrawerOpen(false);
  };

  const joinButtonClass = overlayHero
    ? "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-dz-primary hover:bg-white/90 sm:px-3.5 sm:py-2 sm:text-sm"
    : "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-dz-primary hover:bg-primary/90 sm:px-3.5 sm:py-2 sm:text-sm";

  return (
    <>
      <header
        className={cn(
          "z-50",
          chromeFree
            ? "pointer-events-none fixed inset-x-0 top-0 border-0 bg-transparent"
            : cn(
                "border-b border-dz-glass-border bg-white/60 backdrop-blur-[20px]",
                overlayHero ? "fixed inset-x-0 top-0" : "sticky top-0",
              ),
        )}
      >
        <PageContainer
          className={cn(
            "flex items-center justify-between gap-4",
            chromeFree ? "h-[88px]" : "h-[88px]",
          )}
        >
          <div className="relative flex w-10 flex-shrink-0 items-center justify-start sm:w-11">
            {showBurger ? (
              <div className={cn(chromeFree && "pointer-events-auto")}>
                <Button
                  className="h-9 w-9 rounded-full bg-primary p-0 text-primary-foreground shadow-dz-primary hover:bg-primary/90 sm:h-10 sm:w-10"
                  onClick={() => setIsDrawerOpen(true)}
                  data-testid="mobile-menu-toggle"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                {user && celebrationCount > 0 && (
                  <button
                    type="button"
                    className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-dz-secondary to-primary px-1 text-[10px] font-bold text-white ring-2 ring-white"
                    aria-label="Session starting soon. Open join prompt."
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
            ) : null}
          </div>

          <BrandLogo
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              chromeFree && "pointer-events-auto",
            )}
            imgClassName={NAV_LOGO_CLASS}
            testId="desktop-logo-link"
          />

          <div
            className={cn(
              "relative flex flex-shrink-0 items-center",
              chromeFree && "pointer-events-auto",
            )}
          >
            {authLoading ? (
              // Hold the slot until auth resolves so we never flash the wrong CTA
              // (e.g. "Join" before "My Account") on a cold load/refresh.
              <div
                className={cn(
                  "h-9 w-[72px] rounded-full sm:w-[80px]",
                  overlayHero ? "bg-white/40" : "bg-primary/10",
                )}
                aria-hidden
                data-testid="nav-auth-loading"
              />
            ) : user ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold shadow-dz-primary sm:px-3.5 sm:py-2 sm:text-sm",
                        !isProfileComplete
                          ? "bg-orange-600 text-primary-foreground hover:bg-orange-700"
                          : overlayHero
                            ? "bg-white text-primary hover:bg-white/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                      data-testid="nav-my-account"
                      onClick={() => {
                        const href = getIncompleteAccountHref(user);
                        if (href) {
                          window.location.href = href;
                          return;
                        }
                        setAccountDrawerOpen(true);
                      }}
                    >
                      {!isProfileComplete && <AlertTriangle className="mr-1 h-3 w-3" />}
                      My Account
                      <Menu className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  {!isProfileComplete ? (
                    <TooltipContent side="bottom" className="max-w-xs text-center">
                      Complete your phone number and Health History to book sessions.
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
            ) : (
              <>
                <Button
                  className={joinButtonClass}
                  data-testid="nav-book-session"
                  onClick={() => setBookingAuthOpen(true)}
                >
                  Join
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
        {user ? (
          <div className="mt-4 border-t border-dz-glass-border pt-4">
            <AccountMenuDrawerButton onNavigate={() => setIsDrawerOpen(false)} />
          </div>
        ) : (
          <div className="mt-4 border-t border-dz-glass-border pt-4">
            <Button
              className="w-full rounded-full bg-primary font-bold text-primary-foreground"
              onClick={() => {
                setBookingAuthOpen(true);
                setIsDrawerOpen(false);
              }}
              data-testid="mobile-nav-book-signup"
            >
              Join
            </Button>
          </div>
        )}
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
