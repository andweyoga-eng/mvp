/** React Query options for member-facing session catalog endpoints. */
export const PUBLIC_SESSION_CATALOG_QUERY_OPTIONS = {
  staleTime: 0,
  refetchInterval: 15_000,
  refetchOnWindowFocus: true,
} as const;

export const PUBLIC_SESSION_CATALOG_QUERY_KEYS = [
  "/api/classes",
  "/api/schedule/week",
  "/api/class-types-availability/upcoming",
  "/api/carousel/promotions",
] as const;
