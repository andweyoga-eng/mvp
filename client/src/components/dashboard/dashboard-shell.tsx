import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Search,
  Bell,
  Menu,
  CalendarDays,
  Smile,
  GraduationCap,
  Mountain,
  Compass,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AccountDrawer } from "@/components/account-drawer";
import { PageContainer } from "@/components/digital-zen/page-container";
import { useAuth } from "@/lib/auth";
import { getIncompleteAccountHref } from "@/lib/account-profile-complete";
import { useProfileCompletionGuard } from "@/hooks/use-profile-completion-guard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import logoPath from "@assets/Logo Transperent TM_1756454893432.png";

export type DashboardSection =
  | "sessions"
  | "calendar"
  | "emojou"
  | "workshops"
  | "trips"
  | "explore";

interface LauncherItem {
  id: DashboardSection;
  label: string;
  icon: typeof CalendarDays;
  /** Internal route or hash this tab opens; omit for not-yet-built sections. */
  href?: string;
}

const LAUNCHER_ITEMS: LauncherItem[] = [
  { id: "sessions", label: "Sessions", icon: Sparkles, href: "/dashboard" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, href: "/calendar" },
  { id: "emojou", label: "Emojou", icon: Smile, href: "/emojou" },
  { id: "workshops", label: "Workshops", icon: GraduationCap, href: "/workshops" },
  { id: "trips", label: "Trips", icon: Mountain, href: "/trips" },
  { id: "explore", label: "Explore", icon: Compass, href: "/explore" },
];

interface DashboardShellProps {
  active: DashboardSection;
  children: ReactNode;
}

export function DashboardShell({ active, children }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  useProfileCompletionGuard();

  const incompleteHref = getIncompleteAccountHref(user);

  const go = (href?: string) => {
    if (!href) {
      toast({ title: "Coming soon", description: "This space is being prepared." });
      return;
    }
    if (href.startsWith("/#")) {
      window.location.href = href;
      return;
    }
    setLocation(href);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-dz-surface text-foreground">
      {/* ambient blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -right-[10%] -top-[12%] z-0 h-[600px] w-[600px] rounded-full bg-primary/[0.06] blur-[80px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-[8%] -left-[8%] z-0 h-[460px] w-[460px] rounded-full bg-dz-secondary/[0.05] blur-[80px]"
      />

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 border-b border-dz-glass-border bg-dz-surface/80 backdrop-blur-[20px]">
        <PageContainer className="flex h-[76px] items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="flex flex-shrink-0 items-center"
            aria-label="andWeYoga dashboard"
            data-testid="dashboard-logo"
          >
            <img src={logoPath} alt="andWeYoga" className="h-[clamp(38px,5.5vw,48px)] w-auto" />
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => toast({ title: "Search", description: "Search is coming soon." })}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-primary"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => toast({ title: "Notifications", description: "No new notifications." })}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-primary"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-dz-secondary ring-2 ring-dz-surface" />
            </button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (incompleteHref) {
                        setLocation(incompleteHref);
                        return;
                      }
                      setDrawerOpen(true);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold shadow-dz-primary transition-transform hover:shadow-dz-hero active:scale-95",
                      incompleteHref
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "bg-primary text-primary-foreground",
                    )}
                    data-testid="dashboard-account-toggle"
                  >
                    <span className="hidden sm:inline">My Account</span>
                    <Menu className="h-[17px] w-[17px]" />
                  </button>
                </TooltipTrigger>
                {incompleteHref ? (
                  <TooltipContent side="bottom" className="max-w-xs text-center">
                    Complete your phone number and health note to book sessions.
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </div>
        </PageContainer>

        {/* ===== SECTION LAUNCHER ===== */}
        <div className="border-t border-dz-glass-border/60 bg-dz-surface/55">
          <PageContainer>
            <nav className="grid grid-cols-6 gap-2 py-3">
              {LAUNCHER_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.href)}
                    title={item.href ? item.label : `${item.label} (coming soon)`}
                    className={cn(
                      "group flex flex-col items-center gap-2 rounded-xl px-1 py-1.5 text-center transition-transform",
                      item.href ? "hover:-translate-y-0.5" : "cursor-default opacity-70",
                    )}
                    data-testid={`launcher-${item.id}`}
                  >
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#8159c4] via-[#4b3282] to-dz-secondary text-white",
                        isActive
                          ? "shadow-[0_16px_30px_rgba(52,25,106,0.5),0_0_0_5px_rgba(52,25,106,0.12)]"
                          : "shadow-[0_14px_26px_rgba(52,25,106,0.4)]",
                      )}
                    >
                      <Icon className="h-[22px] w-[22px]" />
                    </span>
                    <span
                      className={cn(
                        "text-[13px] leading-none",
                        isActive ? "font-bold text-primary" : "font-semibold text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </PageContainer>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="relative z-[1]">{children}</main>

      {/* ===== ACCOUNT DRAWER (shared across all pages) ===== */}
      <AccountDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* ===== FAB ===== */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-white shadow-dz-hero transition-transform hover:scale-105 active:scale-95"
        aria-label="Open menu"
        data-testid="dashboard-fab"
      >
        <Menu className="h-7 w-7" />
      </button>
    </div>
  );
}
