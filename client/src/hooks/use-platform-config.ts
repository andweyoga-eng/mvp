import { useQuery } from "@tanstack/react-query";

export const PLATFORM_CONFIG_QUERY_KEY = ["/api/platform/config"] as const;

export interface PlatformConfig {
  guestCheckoutEnabled: boolean;
  maintenanceWindowEnabled: boolean;
}

const DEFAULT_CONFIG: PlatformConfig = {
  guestCheckoutEnabled: false,
  maintenanceWindowEnabled: false,
};

async function fetchPlatformConfig(): Promise<PlatformConfig> {
  const res = await fetch("/api/platform/config");
  if (!res.ok) return DEFAULT_CONFIG;
  const data = (await res.json()) as Partial<PlatformConfig>;
  return {
    guestCheckoutEnabled: data.guestCheckoutEnabled !== false,
    maintenanceWindowEnabled: data.maintenanceWindowEnabled === true,
  };
}

/** Public platform flags — defaults OFF while loading to avoid flash of guest UI. */
export function usePlatformConfig() {
  const query = useQuery({
    queryKey: PLATFORM_CONFIG_QUERY_KEY,
    queryFn: fetchPlatformConfig,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    ...query,
    guestCheckoutEnabled: query.data?.guestCheckoutEnabled ?? DEFAULT_CONFIG.guestCheckoutEnabled,
    maintenanceWindowEnabled:
      query.data?.maintenanceWindowEnabled ?? DEFAULT_CONFIG.maintenanceWindowEnabled,
  };
}
