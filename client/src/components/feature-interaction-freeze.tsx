import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  isFeatureTabInteractive,
  type FeatureTabId,
  usePlatformConfig,
} from "@/hooks/use-platform-config";

/**
 * Platform-level freeze: page stays open; CTAs/inputs non-interactive when the
 * feature interactive toggle is off (SPEC-PLATFORM-FEATURE-GATES-01).
 * Entitlement overrides are deferred.
 */
export function FeatureInteractionFreeze({
  feature,
  children,
  className,
}: {
  feature: FeatureTabId;
  children: ReactNode;
  className?: string;
}) {
  const config = usePlatformConfig();
  const interactive = isFeatureTabInteractive(feature, config);

  if (interactive) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
        data-testid={`feature-frozen-${feature}`}
      >
        Inputs and actions on this page are temporarily paused by the studio. You can still view the
        page.
      </div>
      <div
        className="pointer-events-none select-none opacity-[0.85]"
        aria-disabled="true"
      >
        {children}
      </div>
    </div>
  );
}
