import type { QueryClient } from "@tanstack/react-query";
import { isFlexiEnabledSchedule, type FlexiEligibleScheduleLike } from "@shared/flexi-mode";
import type { FlexiOptionsData } from "@/components/flexi-checkout-section";
import type { BookingIntent } from "@/lib/pending-booking";

/**
 * Single source of truth for the Flexi options request.
 *
 * Every surface (reserve checkout, booking modal, Book-click prefetch, future
 * search hover) MUST go through this so the React Query key + fetch behaviour
 * stay identical and the cache dedupes correctly.
 */

/** Flexi slot capacity changes over time; revalidate after this window. */
export const FLEXI_OPTIONS_STALE_MS = 45_000;

const prefetchTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function flexiOptionsQueryKey(
  anchorClassId: string,
  programId?: string | null,
): readonly [string, string, string] {
  return ["/api/flexi/options", anchorClassId, programId ?? ""];
}

export async function fetchFlexiOptions(
  anchorClassId: string,
  programId?: string | null,
): Promise<FlexiOptionsData> {
  const qs = programId ? `?programId=${encodeURIComponent(programId)}` : "";
  const res = await fetch(`/api/flexi/options/${anchorClassId}${qs}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.message === "string" ? body.message : "Failed to load Flexi options",
    );
  }
  return res.json();
}

export function flexiOptionsQueryOptions(
  anchorClassId: string | null | undefined,
  programId?: string | null,
) {
  return {
    queryKey: flexiOptionsQueryKey(anchorClassId ?? "", programId),
    queryFn: () => fetchFlexiOptions(anchorClassId as string, programId),
    staleTime: FLEXI_OPTIONS_STALE_MS,
    retry: false as const,
  };
}

export function prefetchFlexiOptionsIfEligible(
  queryClient: QueryClient,
  anchorClassId: string,
  schedule?: FlexiEligibleScheduleLike | null,
  programId?: string | null,
): Promise<void> {
  if (!anchorClassId) return Promise.resolve();
  // Guard against firing (and 404-ing) for schedules we already know are ineligible.
  if (schedule != null && !isFlexiEnabledSchedule(schedule)) {
    return Promise.resolve();
  }
  return queryClient
    .prefetchQuery(flexiOptionsQueryOptions(anchorClassId, programId))
    .then(() => undefined)
    .catch(() => undefined);
}

function resolveScheduleFromCache(
  queryClient: QueryClient,
  sessionId: string,
  schedule?: FlexiEligibleScheduleLike | null,
  classes?: FlexiEligibleScheduleLike[],
): FlexiEligibleScheduleLike | undefined {
  if (schedule) return schedule;
  const fromList = classes?.find((row) => row.id === sessionId);
  if (fromList) return fromList;
  const cached = queryClient.getQueryData<FlexiEligibleScheduleLike[]>(["/api/classes"]);
  return cached?.find((row) => row.id === sessionId);
}

/**
 * Prefetch on Book intent when a concrete session id is known.
 * classTypeId-only intents intentionally fall back to reserve on-mount fetch,
 * because the anchor session isn't resolved until the reserve pool is built.
 */
export function prefetchFlexiOptionsForIntent(
  queryClient: QueryClient,
  intent: BookingIntent,
  options?: {
    schedule?: FlexiEligibleScheduleLike | null;
    classes?: FlexiEligibleScheduleLike[];
  },
): Promise<void> {
  if (!intent.sessionId) return Promise.resolve();
  const schedule = resolveScheduleFromCache(
    queryClient,
    intent.sessionId,
    options?.schedule,
    options?.classes,
  );
  // When we can't resolve the schedule we still attempt the prefetch; the
  // endpoint is authoritative and a 404 is swallowed.
  if (schedule && !isFlexiEnabledSchedule(schedule)) {
    return Promise.resolve();
  }
  return prefetchFlexiOptionsIfEligible(queryClient, intent.sessionId, schedule);
}

/**
 * Debounced hover/focus prefetch. MUST be attached to a specific row's intent
 * (hover/focus), never fired on list render — that would cause an N+1 storm on
 * large search result sets.
 */
export function prefetchFlexiOptionsOnIntent(
  queryClient: QueryClient,
  schedule: FlexiEligibleScheduleLike | null | undefined,
  delayMs = 150,
): void {
  if (!schedule?.id || !isFlexiEnabledSchedule(schedule)) return;

  const existing = prefetchTimers.get(schedule.id);
  if (existing) clearTimeout(existing);

  prefetchTimers.set(
    schedule.id,
    setTimeout(() => {
      prefetchTimers.delete(schedule.id);
      void prefetchFlexiOptionsIfEligible(queryClient, schedule.id, schedule);
    }, delayMs),
  );
}

/** Spreadable hover/focus handlers for Book buttons and schedule cards. */
export function flexiPrefetchIntentProps(
  queryClient: QueryClient,
  schedule: FlexiEligibleScheduleLike | null | undefined,
): { onMouseEnter: () => void; onFocus: () => void } {
  return {
    onMouseEnter: () => prefetchFlexiOptionsOnIntent(queryClient, schedule),
    onFocus: () => prefetchFlexiOptionsOnIntent(queryClient, schedule),
  };
}
