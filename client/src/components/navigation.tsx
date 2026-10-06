import { useState } from "react";
import { AlertTriangle, Sparkles, Menu, X } from "lucide-react";
import { usePaymentVerifiedCelebrations } from "@/components/payment-verified-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { QuitSetupDialog } from "@/components/quit-setup-dialog";
import { useToast } from "@/hooks/use-toast";
import { clearMemberLandingCheck } from "@/lib/member-landing";

interface NavigationProps {
  onBookingClick: () => void;
}

const DRAWER_LINKS = [
  { id: "care", label: "and We", accent: "Care" },
  { id: "vibe", label: "and We", accent: "Vibe" },
  { id: "teach", label: "and We", accent: "Workout" },
  { id: "story", label: "and Our", accent: "Story" },
  { id: "believe", label: "and We", accent: "Believe" },
  { id: "ally", label: "and We Meet", accent: "Coach" },
] as const;

export default function Navigation({ onBookingClick }: NavigationProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [bookingAuthOpen, setBookingAuthOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [quitSaving, setQuitSaving] = useState(false);
  const { user, isLoading: authLoading, logout, updateProfile } = useAuth();
  const { celebrationCount, openCelebrationFromMenu } = usePaymentVerifiedCelebrations();
  const { toast } = useToast();

  const isProfileComplete = isAuthUserProfileComplete(user);
  const incompleteHref = user ? getIncompleteAccountHref(user) : null;

  const goToHomeSection = (sectionId: string) => {
    if (user) {
      window.location.href = "/dashboard";
      setIsDrawerOpen(false);
      return;
    }
    navigateToHomeSection(sectionId);
    setIsDrawerOpen(false);
  };

  const finishQuitToMarketing = async () => {
    clearMemberLandingCheck();
    await logout();
    window.location.assign("/");
  };

  const handleSaveAndQuit = async () => {
    if (!user) return;
    setQuitSaving(true);
    try {
      await updateProfile(
        {
          name: user.name,
          primaryMobile: user.primaryMobile ?? "",
          primaryMobileCountryCode: user.primaryMobileCountryCode ?? "+91",
          secondaryMobile: user.secondaryMobile ?? undefined,
          secondaryMobileCountryCode: user.secondaryMobileCountryCode ?? undefined,
          emergencyMobile: user.emergencyMobile ?? "",
          emergencyMobileCountryCode: user.emergencyMobileCountryCode ?? "+91",
          dateOfBirth: user.dateOfBirth ?? undefined,
          whatsappConsent: user.whatsappConsent,
          addressStreet: user.addressStreet ?? undefined,
          addressLine2: user.addressLine2 ?? undefined,
          addressCity: user.addressCity ?? undefined,
          addressCountry: user.addressCountry ?? undefined,
          addressState: user.addressState ?? undefined,
          addressPincode: user.addressPincode ?? undefined,
        },
        { silent: true },
      );
      toast({ title: "Contact info saved", description: "Signed out - finish setup anytime." });
      await finishQuitToMarketing();
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
      setQuitSaving(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-dz-glass-border bg-white/60 backdrop-blur-[20px]">
        <PageContainer className="grid h-[64px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:h-[76px] sm:gap-4">
          <div className="relative z-10 flex-shrink-0">
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

          <div className="flex min-w-0 items-center justify-center px-1">
            <BrandLogo
              className="mx-auto"
              imgClassName="h-[clamp(32px,8vw,52px)] w-auto max-h-[52px] max-w-full object-contain"
              testId="desktop-logo-link"
            />
          </div>

          <div className="relative z-10 flex flex-shrink-0 items-center justify-end">
            {authLoading ? (
              <div
                className="h-9 w-[96px] rounded-full bg-primary/10 sm:w-[136px]"
                aria-hidden
                data-testid="nav-auth-loading"
              />
            ) : user ? (
              !isProfileComplete ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="rounded-full bg-orange-600 px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-dz-primary hover:bg-orange-700 sm:px-3.5 sm:py-2 sm:text-sm"
                        data-testid="nav-my-account"
                      >
                        <AlertTriangle className="mr-1 h-3 w-3 shrink-0" />
                        <span className="truncate">My Account</span>
                        <Menu className="ml-1 h-3.5 w-3.5 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() => {
                          if (incompleteHref) window.location.href = incompleteHref;
                          else setAccountDrawerOpen(true);
                        }}
                      >
                        Continue with setup
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setQuitOpen(true)}>
                        Quit setup
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <QuitSetupDialog
                    open={quitOpen}
                    onOpenChange={setQuitOpen}
                    saving={quitSaving}
                    onSaveAndQuit={handleSaveAndQuit}
                    onQuitAnyway={finishQuitToMarketing}
                  />
                </>
              ) : (
                <Button
                  className="rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-dz-primary hover:bg-primary/90 sm:px-3.5 sm:py-2 sm:text-sm"
                  data-testid="nav-my-account"
                  onClick={() => setAccountDrawerOpen(true)}
                >
                  My Account
                  <Menu className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              )
            ) : (
              <>
                <Button
                  className="rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-dz-primary hover:bg-primary/90 sm:px-3.5 sm:py-2 sm:text-sm"
                  data-testid="nav-book-session"
                  onClick={() => setBookingAuthOpen(true)}
                >
                  Book/Signup
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
              Book / Sign up
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
