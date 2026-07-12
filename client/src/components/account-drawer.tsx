import { useLocation } from "wouter";
import {
  X,
  CalendarPlus,
  User,
  HeartPulse,
  History,
  CreditCard,
  Smartphone,
  LogOut,
  type LucideIcon,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { myAccountHref } from "@/lib/account-routes";
import { AccountComingSoonBadge } from "@/components/account-fold-section";

/**
 * The single account drawer used on every signed-in surface (top Navigation and
 * the DashboardShell). All items deep-link into the one `/my-account` page so
 * there is exactly one account experience and one drawer in the app.
 */

interface DrawerItem {
  label: string;
  icon: LucideIcon;
  href: string;
  soon?: boolean;
  primary?: boolean;
}

const DRAWER_ITEMS: DrawerItem[] = [
  { label: "Book Sessions", icon: CalendarPlus, href: "/calendar", primary: true },
  { label: "Contact Info", icon: User, href: myAccountHref("profile") },
  { label: "Health Updates", icon: HeartPulse, href: myAccountHref("health") },
  { label: "Session History", icon: History, href: myAccountHref("sessions") },
  { label: "Payments", icon: CreditCard, href: myAccountHref("payments") },
  { label: "Privacy & consent", icon: Shield, href: myAccountHref("privacy") },
  { label: "Link Devices", icon: Smartphone, href: myAccountHref("preferences"), soon: true },
];

interface AccountDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDrawer({ open, onOpenChange }: AccountDrawerProps) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const initial = (user?.name?.trim()?.[0] ?? "Y").toUpperCase();

  const go = (href: string) => {
    onOpenChange(false);
    setLocation(href);
    // Same-page anchor changes don't remount the page, so nudge it to scroll.
    if (href.includes("#")) {
      requestAnimationFrame(() => window.dispatchEvent(new Event("hashchange")));
    }
  };

  return (
    <>
      <div
        onClick={() => onOpenChange(false)}
        className={cn(
          "fixed inset-0 z-[55] bg-foreground/40 backdrop-blur-[4px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        data-testid="account-drawer-overlay"
      />

      <aside
        className={cn(
          "fixed right-0 top-0 z-[60] flex h-screen w-[min(360px,88vw)] flex-col justify-between overflow-y-auto border-l border-dz-glass-border bg-white p-4 shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        data-testid="account-drawer"
        aria-hidden={!open}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-dz-glass-border pb-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4b3282] to-primary font-display text-lg font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-primary">My Account</h3>
                <p className="mt-0.5 truncate text-sm font-medium text-foreground/80">
                  {user?.name ?? "Manage your wellness journey"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-primary/[0.06]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {DRAWER_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-[15px] font-medium transition-colors",
                    item.primary
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-foreground/85 hover:bg-primary/[0.06] hover:text-primary",
                  )}
                  data-testid={`account-drawer-link-${idx}`}
                >
                  <Icon className="h-[21px] w-[21px]" />
                  <span className="flex-1">{item.label}</span>
                  {item.soon ? <AccountComingSoonBadge /> : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-dz-glass-border pt-4">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              logout();
            }}
            className="flex items-center gap-2.5 px-1.5 py-2 text-[13px] text-destructive transition-opacity hover:opacity-75"
            data-testid="account-drawer-sign-out"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
