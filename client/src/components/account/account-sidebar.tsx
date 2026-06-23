import { useLocation } from "wouter";
import { useAccount } from "@/components/account/account-context";
import { ACCOUNT_MENU_ITEMS, AccountMenuItemRow } from "@/components/account/account-menu-items";
import { getAccountSectionFromPath } from "@/lib/account-routes";

/** Desktop sidebar for account sub-pages. */
export function AccountSidebar() {
  const [, setLocation] = useLocation();
  const { isProfileSectionIncomplete, isHealthSectionIncomplete } = useAccount();
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <aside
      className="hidden w-[240px] shrink-0 md:block"
      data-testid="account-sidebar"
    >
      <nav className="sticky top-36 flex flex-col gap-1 rounded-xl border border-border bg-white p-2 shadow-sm">
        {ACCOUNT_MENU_ITEMS.map((item) => {
          const isIncomplete =
            item.section === "profile"
              ? isProfileSectionIncomplete
              : item.section === "health"
                ? isHealthSectionIncomplete
                : false;

          return (
            <AccountMenuItemRow
              key={item.section}
              item={item}
              isActive={getAccountSectionFromPath(currentPath) === item.section}
              isIncomplete={Boolean(item.showIncompleteDot && isIncomplete)}
              onSelect={() => setLocation(item.href)}
            />
          );
        })}
      </nav>
    </aside>
  );
}
