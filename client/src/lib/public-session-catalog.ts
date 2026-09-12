/** React Query options for member-facing session catalog endpoints. */
export const PUBLIC_SESSION_CATALOG_QUERY_OPTIONS = {
  staleTime: 0,
  refetchInterval: 15_000,
  refetchOnWindowFocus: true,
} as const;

export const PUBLIC_SESSION_CATALOG_QUERY_KEYS = [
  "/api/classes",
  "/api/schedule/week",
  "/api/schedule/month",
  "/api/class-types-availability/upcoming",
  "/api/carousel/promotions",
] as const;

export async function fetchScheduleMonth<T = unknown>(year: number, month: number): Promise<T> {
  const qs = new URLSearchParams({ year: String(year), month: String(month) });
  const res = await fetch(`/api/schedule/month?${qs}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch monthly schedule");
  }
  return res.json() as Promise<T>;
}
