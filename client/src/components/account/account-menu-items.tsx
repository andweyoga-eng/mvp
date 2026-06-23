import {
  ClipboardList,
  CreditCard,
  ChevronRight,
  HeartPulse,
  User,
  type LucideIcon,
} from "lucide-react";
import { ACCOUNT_ROUTES, type AccountSection } from "@/lib/account-routes";

export type AccountMenuItem = {
  section: Exclude<AccountSection, "sessions">;
  label: string;
  href: string;
  icon: LucideIcon;
  testId: string;
  showIncompleteDot?: boolean;
};

export const ACCOUNT_MENU_ITEMS: AccountMenuItem[] = [
  {
    section: "profile",
    label: "My Profile",
    href: ACCOUNT_ROUTES.profile,
    icon: User,
    testId: "account-menu-profile",
    showIncompleteDot: true,
  },
  {
    section: "health",
    label: "Health Update",
    href: ACCOUNT_ROUTES.health,
    icon: HeartPulse,
    testId: "account-menu-health",
    showIncompleteDot: true,
  },
  {
    section: "subscriptions",
    label: "My Subscriptions",
    href: ACCOUNT_ROUTES.subscriptions,
    icon: ClipboardList,
    testId: "account-menu-subscriptions",
  },
  {
    section: "payments",
    label: "Payment History",
    href: ACCOUNT_ROUTES.payments,
    icon: CreditCard,
    testId: "account-menu-payments",
  },
];

export function AccountMenuItemRow({
  item,
  isActive,
  isIncomplete,
  onSelect,
}: {
  item: AccountMenuItem;
  isActive: boolean;
  isIncomplete: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={item.testId}
      className={`flex w-full min-h-14 md:min-h-12 items-center gap-3 rounded-lg px-3 text-left transition-colors ${
        isActive
          ? "bg-purple-50 text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span className="flex-1 text-sm font-semibold">{item.label}</span>
      {item.showIncompleteDot && isIncomplete && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500"
          aria-label="Incomplete section"
          data-testid={`${item.testId}-incomplete-dot`}
        />
      )}
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
    </button>
  );
}
