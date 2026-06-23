import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAccount } from "@/components/account/account-context";
import { ACCOUNT_MENU_ITEMS, AccountMenuItemRow } from "@/components/account/account-menu-items";
import { getAccountSectionFromPath } from "@/lib/account-routes";

function ProfileCompletionDot({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span
        className="h-2.5 w-2.5 rounded-full bg-green-600"
        aria-label="Profile complete"
        data-testid="account-menu-complete-dot"
      />
    );
  }
  return (
    <span
      className="h-2.5 w-2.5 rounded-full bg-amber-500"
      aria-label="Profile incomplete"
      data-testid="account-menu-incomplete-dot"
    />
  );
}

function AccountMenuList({ onNavigate }: { onNavigate?: () => void }) {
  const [, setLocation] = useLocation();
  const { isProfileSectionIncomplete, isHealthSectionIncomplete } = useAccount();
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <nav className="flex flex-col gap-1 p-2" data-testid="account-menu-list">
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
            onSelect={() => {
              setLocation(item.href);
              onNavigate?.();
            }}
          />
        );
      })}
    </nav>
  );
}

export function AccountNavMenu() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const { isProfileComplete } = useAccount();

  return (
    <>
      {/* Mobile: bottom sheet trigger */}
      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-12 gap-2 rounded-full border-primary/20 px-4 font-semibold text-primary"
          onClick={() => setMobileOpen(true)}
          data-testid="account-menu-trigger-mobile"
        >
          My Account
          <ProfileCompletionDot complete={isProfileComplete} />
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl px-0 pb-8 pt-3 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom [&>button]:hidden"
            data-testid="account-menu-bottom-sheet"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" aria-hidden="true" />
            <SheetHeader className="px-6 pb-2 text-left">
              <SheetTitle className="text-primary">My Account</SheetTitle>
            </SheetHeader>
            <AccountMenuList onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: dropdown */}
      <div className="hidden md:block">
        <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-full border-primary/20 px-4 font-semibold text-primary"
              data-testid="account-menu-trigger-desktop"
            >
              My Account
              <ProfileCompletionDot complete={isProfileComplete} />
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[240px] animate-in fade-in-0 slide-in-from-top-1 p-0 duration-150"
            data-testid="account-menu-dropdown"
          >
            <AccountMenuList onNavigate={() => setDesktopOpen(false)} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
