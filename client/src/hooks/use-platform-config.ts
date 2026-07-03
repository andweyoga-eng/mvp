import { useQuery } from "@tanstack/react-query";

export const PLATFORM_CONFIG_QUERY_KEY = ["/api/platform/config"] as const;

export interface PlatformConfig {
  guestCheckoutEnabled: boolean;
}

const DEFAULT_CONFIG: PlatformConfig = { guestCheckoutEnabled: false };

async function fetchPlatformConfig(): Promise<PlatformConfig> {
  const res = await fetch("/api/platform/config");
  if (!res.ok) return DEFAULT_CONFIG;
  const data = (await res.json()) as Partial<PlatformConfig>;
  return {
    guestCheckoutEnabled: data.guestCheckoutEnabled !== false,
  };
}

/** Public platform flags — defaults OFF while loading to avoid flash of guest UI. */
export function usePlatformConfig() {
  const query = useQuery({
    queryKey: PLATFORM_CONFIG_QUERY_KEY,
    queryFn: fetchPlatformConfig,
    staleTime: 60_000,
  });

  return {
    ...query,
    guestCheckoutEnabled: query.data?.guestCheckoutEnabled ?? DEFAULT_CONFIG.guestCheckoutEnabled,
  };
}
