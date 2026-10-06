import type { QueryClient } from "@tanstack/react-query";
import { prefetchFlexiOptionsForIntent } from "@/lib/flexi-options";
import type { BookingIntent } from "@/lib/pending-booking";
import type { FlexiEligibleScheduleLike } from "@shared/flexi-mode";

/**
 * Single Book -> Reserve navigation entry for signed-in members.
 *
 * It kicks off the Flexi options prefetch (when a concrete session id is known
 * and the schedule is eligible) BEFORE navigating, so the reserve checkout can
 * paint cached results instantly. Every discovery surface — and any future
 * search bar — routes through here to inherit prefetch for free.
 *
 * `from` is preserved verbatim so reserve's back/exit routing is unchanged.
 */
export function navigateToMemberReserve(
  setLocation: (path: string) => void,
  queryClient: QueryClient,
  intent: BookingIntent,
  from: string,
  options?: {
    schedule?: FlexiEligibleScheduleLike | null;
    classes?: FlexiEligibleScheduleLike[];
  },
): boolean {
  const href = intent.sessionId
    ? `/reserve?sessionId=${encodeURIComponent(intent.sessionId)}&from=${from}`
    : intent.classTypeId
      ? `/reserve?classTypeId=${encodeURIComponent(intent.classTypeId)}&from=${from}`
      : null;

  if (!href) return false;

  void prefetchFlexiOptionsForIntent(queryClient, intent, options);
  setLocation(href);
  return true;
}
