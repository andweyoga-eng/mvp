import { SessionHistory } from "@/components/session-history";
import { useAccount } from "@/components/account/account-context";
import { parseAccountSessionsTab } from "@/lib/account-routes";

export function AccountSessionsPage() {
  const { user } = useAccount();
  const sessionsTab = parseAccountSessionsTab(
    typeof window !== "undefined" ? window.location.search : "",
  );

  return (
    <div data-testid="sessions-content">
      <SessionHistory userId={user.id} initialSubTab={sessionsTab} />
    </div>
  );
}
