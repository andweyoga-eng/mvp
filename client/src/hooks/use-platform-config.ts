import { useQuery } from "@tanstack/react-query";

export const PLATFORM_CONFIG_QUERY_KEY = ["/api/platform/config"] as const;

export interface PlatformConfig {
  guestCheckoutEnabled: boolean;
  maintenanceWindowEnabled: boolean;
  featureWedietVisible: boolean;
  featureWedietInteractive: boolean;
  featureWeemoVisible: boolean;
  featureWeemoInteractive: boolean;
  featureWebuildVisible: boolean;
  featureWebuildInteractive: boolean;
  featureAndweyogaAlwaysAvailable: boolean;
}

const DEFAULT_CONFIG: PlatformConfig = {
  guestCheckoutEnabled: false,
  maintenanceWindowEnabled: false,
  featureWedietVisible: true,
  featureWedietInteractive: true,
  featureWeemoVisible: true,
  featureWeemoInteractive: true,
  featureWebuildVisible: true,
  featureWebuildInteractive: true,
  featureAndweyogaAlwaysAvailable: true,
};

async function fetchPlatformConfig(): Promise<PlatformConfig> {
  const res = await fetch("/api/platform/config");
  if (!res.ok) return DEFAULT_CONFIG;
  const data = (await res.json()) as Partial<PlatformConfig>;
  return {
    guestCheckoutEnabled: data.guestCheckoutEnabled !== false,
    maintenanceWindowEnabled: data.maintenanceWindowEnabled === true,
    featureWedietVisible: data.featureWedietVisible !== false,
    featureWedietInteractive: data.featureWedietInteractive !== false,
    featureWeemoVisible: data.featureWeemoVisible !== false,
    featureWeemoInteractive: data.featureWeemoInteractive !== false,
    featureWebuildVisible: data.featureWebuildVisible !== false,
    featureWebuildInteractive: data.featureWebuildInteractive !== false,
    featureAndweyogaAlwaysAvailable: data.featureAndweyogaAlwaysAvailable !== false,
  };
}

/** Public platform flags — feature gates default ON while loading to avoid blank launcher flash. */
export function usePlatformConfig() {
  const query = useQuery({
    queryKey: PLATFORM_CONFIG_QUERY_KEY,
    queryFn: fetchPlatformConfig,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const data = query.data ?? DEFAULT_CONFIG;

  return {
    ...query,
    guestCheckoutEnabled: data.guestCheckoutEnabled,
    maintenanceWindowEnabled: data.maintenanceWindowEnabled,
    featureWedietVisible: data.featureWedietVisible,
    featureWedietInteractive: data.featureWedietInteractive,
    featureWeemoVisible: data.featureWeemoVisible,
    featureWeemoInteractive: data.featureWeemoInteractive,
    featureWebuildVisible: data.featureWebuildVisible,
    featureWebuildInteractive: data.featureWebuildInteractive,
    featureAndweyogaAlwaysAvailable: data.featureAndweyogaAlwaysAvailable,
  };
}

export type FeatureTabId = "wediet" | "weemo" | "webuild" | "andweyoga";

export function isFeatureTabVisible(
  tab: FeatureTabId,
  config: Pick<
    PlatformConfig,
    | "featureWedietVisible"
    | "featureWeemoVisible"
    | "featureWebuildVisible"
    | "featureAndweyogaAlwaysAvailable"
  >,
): boolean {
  switch (tab) {
    case "wediet":
      return config.featureWedietVisible;
    case "weemo":
      return config.featureWeemoVisible;
    case "webuild":
      return config.featureWebuildVisible;
    case "andweyoga":
      return true;
  }
}

export function isFeatureTabInteractive(
  tab: FeatureTabId,
  config: Pick<
    PlatformConfig,
    | "featureWedietInteractive"
    | "featureWeemoInteractive"
    | "featureWebuildInteractive"
  >,
): boolean {
  switch (tab) {
    case "wediet":
      return config.featureWedietInteractive;
    case "weemo":
      return config.featureWeemoInteractive;
    case "webuild":
      return config.featureWebuildInteractive;
    case "andweyoga":
      return true;
  }
}
