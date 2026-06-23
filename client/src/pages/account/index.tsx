import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { AccountProvider, useAccount } from "@/components/account/account-context";
import { AccountHeader } from "@/components/account/account-header";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { AccountSessionsPage } from "@/components/account/account-sessions-page";
import { AccountProfilePage } from "@/components/account/account-profile-page";
import {
  AccountHealthPage,
  AccountSubscriptionsPage,
  AccountPaymentsPage,
} from "@/components/account/account-subpages";
import { getAccountSectionFromPath } from "@/lib/account-routes";

const scrollToSchedule = () => {
  window.location.href = "/?openBooking=true";
};

function AccountPageBody() {
  const [location] = useLocation();
  const pathname = location.split("?")[0] || "/account";
  const section = getAccountSectionFromPath(pathname);
  const isSubPage = section !== "sessions";

  let content = null;
  switch (section) {
    case "profile":
      content = <AccountProfilePage />;
      break;
    case "health":
      content = <AccountHealthPage />;
      break;
    case "subscriptions":
      content = <AccountSubscriptionsPage />;
      break;
    case "payments":
      content = <AccountPaymentsPage />;
      break;
    default:
      content = <AccountSessionsPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50">
      <Navigation onBookingClick={scrollToSchedule} />

      <div className="px-4 pb-8 pt-20 md:pt-16">
        <div className="mx-auto max-w-5xl">
          <AccountHeader section={section} />

          {isSubPage ? (
            <div className="flex gap-8">
              <AccountSidebar />
              <main className="min-w-0 flex-1">{content}</main>
            </div>
          ) : (
            <main className="mx-auto max-w-2xl">{content}</main>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountApp() {
  return (
    <AccountProvider>
      <AccountPageBody />
    </AccountProvider>
  );
}
