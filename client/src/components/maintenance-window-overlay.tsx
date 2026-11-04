import { useLocation } from "wouter";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import {
  MAINTENANCE_OVERLAY_BODY,
  MAINTENANCE_OVERLAY_HEADLINE,
} from "@shared/maintenance-notify";

/** Opt out via VITE_SKIP_MAINTENANCE_OVERLAY=true for unrestricted local dev. */
function isMaintenanceOverlaySkipped(): boolean {
  return import.meta.env.VITE_SKIP_MAINTENANCE_OVERLAY === "true";
}

/** Full-screen frosted overlay when maintenance window is on (public member app only). */
export function MaintenanceWindowOverlay() {
  const [location] = useLocation();
  const { maintenanceWindowEnabled, isLoading } = usePlatformConfig();

  const isAdminRoute = location.startsWith("/admin");

  if (isMaintenanceOverlaySkipped() || isLoading || !maintenanceWindowEnabled || isAdminRoute) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-body"
      data-testid="maintenance-window-overlay"
    >
      <div className="mx-4 max-w-md rounded-2xl border border-white/20 bg-white/95 px-8 py-10 text-center shadow-2xl">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          andWeYoga
        </p>
        <h1
          id="maintenance-title"
          className="mt-4 font-display text-2xl font-bold text-gray-900 md:text-3xl"
        >
          {MAINTENANCE_OVERLAY_HEADLINE}
        </h1>
        <p id="maintenance-body" className="mt-4 text-base leading-relaxed text-muted-foreground">
          {MAINTENANCE_OVERLAY_BODY}
        </p>
      </div>
    </div>
  );
}
