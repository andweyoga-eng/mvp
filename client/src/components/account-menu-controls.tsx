import { useEffect, useState } from "react";
import { AlertTriangle, Menu } from "lucide-react";
import { AccountDrawer } from "@/components/account-drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { getIncompleteAccountHref } from "@/lib/account-profile-complete";
import { cn } from "@/lib/utils";

interface AccountMenuControlsProps {
  /** Sticky header pill — visible while the header is in view. */
  showHeaderButton?: boolean;
  /**
   * Bottom-right hamburger — only appears after scrolling past the first fold
   * so account stays reachable without duplicating the header CTA at the top.
   */
  /** When true, the floating menu button is always visible (not only after scroll). */
  alwaysShowFloatingMenu?: boolean;
  showFloatingMenuWhenScrolled?: boolean;
  scrollThreshold?: number;
  headerButtonClassName?: string;
  headerTestId?: string;
  fabTestId?: string;
}

export function AccountMenuControls({
  showHeaderButton = true,
  alwaysShowFloatingMenu = false,
  showFloatingMenuWhenScrolled = false,
  scrollThreshold = 120,
  headerButtonClassName,
  headerTestId = "account-menu-header",
  fabTestId = "account-menu-fab",
}: AccountMenuControlsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolledPastFold, setScrolledPastFold] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const incompleteHref = getIncompleteAccountHref(user);

  useEffect(() => {
    if (!showFloatingMenuWhenScrolled) return;
    const onScroll = () => setScrolledPastFold(window.scrollY > scrollThreshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showFloatingMenuWhenScrolled, scrollThreshold]);

  const openAccount = () => {
    if (incompleteHref) {
      window.location.href = incompleteHref;
      return;
    }
    setDrawerOpen(true);
  };

  if (authLoading || !user) return null;

  const showFab = alwaysShowFloatingMenu || (showFloatingMenuWhenScrolled && scrolledPastFold);

  return (
    <>
      {showHeaderButton ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={openAccount}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold shadow-dz-primary transition-transform hover:shadow-dz-hero active:scale-95",
                  incompleteHref
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-primary text-primary-foreground",
                  headerButtonClassName,
                )}
                data-testid={headerTestId}
              >
                {incompleteHref ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                <span className="hidden sm:inline">My Account</span>
                <Menu className="h-[17px] w-[17px]" />
              </button>
            </TooltipTrigger>
            {incompleteHref ? (
              <TooltipContent side="bottom" className="max-w-xs text-center">
                Complete your phone number and Health History to book sessions.
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
      ) : null}

      {showFab ? (
        <button
          type="button"
          onClick={openAccount}
          className="fixed bottom-6 right-6 z-40 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-white shadow-dz-hero transition-transform hover:scale-105 active:scale-95"
          aria-label="Open my account menu"
          data-testid={fabTestId}
        >
          <Menu className="h-7 w-7" />
        </button>
      ) : null}

      <AccountDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}

/** Opens the account drawer from a parent menu (e.g. the AWY explore drawer). */
export function AccountMenuDrawerButton({
  onNavigate,
  className,
  testId = "drawer-my-account",
}: {
  onNavigate?: () => void;
  className?: string;
  testId?: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const incompleteHref = getIncompleteAccountHref(user);

  if (!user) return null;

  const openAccount = () => {
    onNavigate?.();
    if (incompleteHref) {
      window.location.href = incompleteHref;
      return;
    }
    setDrawerOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openAccount}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-3.5 py-3 text-left font-display text-base font-semibold text-primary transition-colors hover:bg-primary/5",
          className,
        )}
        data-testid={testId}
      >
        My Account
        <Menu className="ml-auto h-4 w-4 text-dz-secondary" />
      </button>
      <AccountDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
