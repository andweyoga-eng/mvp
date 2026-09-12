# Flexi Discovery & Prefetch Architecture

Compiled: 13 July 2026

This note records the locked technical decisions behind the Flexi checkout
loading UX and the groundwork for a future Flexi-aware search / filter / sort
surface. It is the source of truth for anyone extending Flexi discovery.

## Goals

1. No spinner at checkout by default. Spin only when the member clicks
   "Customise with Flexi" and the options are not yet ready.
2. Use the time between the Book click and the Flexi click to prefetch options,
   so the checkout paints instantly.
3. When there are no swaps, show a greyed Flexi button and a friendly message
   immediately, with no spinner.
4. Keep both booking options open by default.
5. Put the basic tech + architecture in place so a future search bar that
   filters "sessions with Flexi swaps" and sorts by "most flexible" drops in
   with no rework.

## The two questions (kept strictly separate)

| Question | Cost | Source |
|---|---|---|
| Is this schedule Flexi-eligible? (badge) | Zero network | Client-side `isFlexiEnabledSchedule` on `flexiEnabled` + `recurrenceKind` + `seriesId` |
| What are the actual swaps + capacity? | Network | `GET /api/flexi/options/:anchorClassId` (single) or `POST /api/flexi/eligibility/batch` (many, summary only) |

Conflating these is the main failure mode: showing a badge on N rows must not
trigger N options calls.

## Building blocks

### `shared/flexi-discovery.ts`
Pure, isomorphic helpers and the discovery contract:
- `FlexiEligibilitySummary` — `{ anchorClassId, eligible, hasMeaningfulSwaps, optionCount, availableOptionCount, flexibilityScore }`. No full option payload.
- `summarizeFlexiOptions(...)` — collapses full options into a summary; reuses `flexiOptionsMatchFixedSlots`.
- `compareFlexiFlexibility(a, b)` — comparator for "most flexible first".
- `emptyFlexiEligibilitySummary(id)` — for ineligible ids.
- `FLEXI_ELIGIBILITY_BATCH_MAX = 50` — batch guardrail.

### `client/src/lib/flexi-options.ts`
Single source of truth for the options request. Everything that touches Flexi
options MUST go through here so the React Query key + fetch stay identical and
the cache dedupes.
- `flexiOptionsQueryKey(id)` -> `["/api/flexi/options", id]`
- `flexiOptionsQueryOptions(id)` -> `{ queryKey, queryFn, staleTime: 45s, retry: false }`
- `prefetchFlexiOptionsForIntent(qc, intent, opts)` — Book-click prefetch (session id only).
- `prefetchFlexiOptionsOnIntent(qc, schedule, delay=150ms)` — debounced hover/focus prefetch.
- `flexiPrefetchIntentProps(qc, schedule)` — spreadable `onMouseEnter` / `onFocus`.

### `client/src/lib/member-reserve-navigation.ts`
`navigateToMemberReserve(setLocation, qc, intent, from, opts?)` — the one Book ->
Reserve entry. Prefetches (when a concrete session id is known and eligible)
then navigates. Home, Dashboard, and Calendar all route through it; future
search does too.

### Server
- `GET /api/flexi/options/:anchorClassId` — full options for one anchor (unchanged).
- `POST /api/flexi/eligibility/batch` — body `{ anchorClassIds: string[] }` (1..50),
  returns `{ summaries: FlexiEligibilitySummary[] }`. Reuses `getFlexiOptions`
  today; optimize when search ships.
- `storage.getFlexiEligibilitySummaries(ids)` — dedupes, caps at the batch max,
  returns one summary per id (ineligible -> empty summary).

## Loading UX contract (checkout)

- Reserve/booking-modal use `flexiOptionsQueryOptions`. Reserve adds
  `refetchOnMount: "always"` so a prefetched cache paints instantly while
  capacity revalidates in the background (`isFetching`, not `isLoading`).
- `FlexiCheckoutSection`: no default spinner. The spinner renders only when
  `bookingMode === "flexi" && isLoading`. The Flexi button is disabled only for
  `noAlternatives` (resolved), never merely for loading. The "no swaps" message
  renders immediately when resolved.

## Prefetch rules

1. Prefetch on **intent** — Book click, or debounced (150ms) hover/focus — never
   on list render. This is what keeps large search result sets from an N+1 storm.
2. Guard by client-side eligibility before firing; unresolved schedules still
   attempt (the endpoint is authoritative and a 404 is swallowed).
3. `classTypeId`-only intents do not prefetch (no anchor session id yet); they
   fall back to reserve's on-mount fetch.

## How future search plugs in (no rework)

1. **Badge** — `isFlexiEligibleSchedule(row)` (zero network). Requires search
   payloads to keep `flexiEnabled`, `recurrenceKind`, `seriesId`.
2. **Filter "has flexi swaps"** — `POST /api/flexi/eligibility/batch` with the
   visible ids (debounced, <=50), filter on `hasMeaningfulSwaps`.
3. **Sort "most flexible"** — `summaries.sort(compareFlexiFlexibility)`.
4. **Book** — call `navigateToMemberReserve` (prefetch is free).
5. **Hover** — spread `flexiPrefetchIntentProps` on result rows.

## Open follow-ups (not blocking)

- When search returns class-type rows vs session rows, distinguish them visually
  ("Pick a session" vs direct Book) so users understand why type-level results
  are not instant.
- `flexibilityScore` is currently `availableOptionCount` when swaps are
  meaningful; can be refined (e.g. distinct weekday-set count) when search ships.
- The batch endpoint reuses `getFlexiOptions` per id; add a set-based query if
  batch volume grows.
