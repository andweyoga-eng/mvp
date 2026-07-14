import { type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Search,
  Bell,
  Smile,
  GraduationCap,
  Mountain,
  Compass,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { focusSessionsSearch } from "@/lib/practice-schedule";
import { AccountMenuControls } from "@/components/account-menu-controls";
import { PageContainer } from "@/components/digital-zen/page-container";
import { useProfileCompletionGuard } from "@/hooks/use-profile-completion-guard";
import { BrandLogo } from "@/components/brand-logo";

export type DashboardSection =
  | "sessions"
  | "emojou"
  | "workshops"
  | "trips"
  | "explore";

interface LauncherItem {
  id: DashboardSection;
  label: string;
  icon: typeof Sparkles;
  /** Internal route or hash this tab opens; omit for not-yet-built sections. */
  href?: string;
}

const LAUNCHER_ITEMS: LauncherItem[] = [
  { id: "sessions", label: "Sessions", icon: Sparkles, href: "/dashboard" },
  { id: "emojou", label: "Emojou", icon: Smile, href: "/emojou" },
  { id: "workshops", label: "we learn", icon: GraduationCap, href: "/workshops" },
  { id: "trips", label: "Trips", icon: Mountain, href: "/trips" },
  { id: "explore", label: "Explore", icon: Compass, href: "/explore" },
];

interface DashboardShellProps {
  active: DashboardSection;
  children: ReactNode;
}

export function DashboardShell({ active, children }: DashboardShellProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  useProfileCompletionGuard();

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
          <BrandLogo testId="dashboard-logo" />

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (active === "sessions") {
                  focusSessionsSearch();
                  return;
                }
                setLocation("/dashboard");
                window.setTimeout(() => focusSessionsSearch(), 120);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-primary"
              aria-label="Search sessions"
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
            <AccountMenuControls
              showHeaderButton
              showFloatingMenuWhenScrolled
              headerTestId="dashboard-account-toggle"
              fabTestId="dashboard-fab"
            />
          </div>
        </PageContainer>

        {/* ===== SECTION LAUNCHER ===== */}
        <div className="border-t border-dz-glass-border/60 bg-dz-surface/55">
          <PageContainer>
            <nav className="grid grid-cols-5 gap-1 py-2 sm:gap-2 sm:py-3">
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
                      "group flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1 text-center transition-transform sm:gap-2 sm:px-1 sm:py-1.5",
                      item.href ? "hover:-translate-y-0.5" : "cursor-default opacity-70",
                    )}
                    data-testid={`launcher-${item.id}`}
                  >
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#8159c4] via-[#4b3282] to-dz-secondary text-white sm:h-11 sm:w-11 sm:rounded-[14px]",
                        isActive
                          ? "shadow-[0_16px_30px_rgba(52,25,106,0.5),0_0_0_5px_rgba(52,25,106,0.12)]"
                          : "shadow-[0_14px_26px_rgba(52,25,106,0.4)]",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" />
                    </span>
                    <span
                      className={cn(
                        "max-w-full text-[10px] leading-tight sm:text-[13px] sm:leading-none sm:whitespace-nowrap",
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
    </div>
  );
}
