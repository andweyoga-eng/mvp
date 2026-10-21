import { useEffect, useId, useState } from "react";
import { ExternalLink, MapPin, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  deliveryModeLabel,
  externalMapUrl,
  hasPhysicalVenue,
  normalizeDeliveryMode,
  toMapEmbedUrl,
  venueSummaryLine,
  type SessionVenueFields,
} from "@/lib/session-delivery-display";

export function SessionDeliveryInfo({
  session,
  paymentLocked = false,
  className,
}: {
  session: SessionVenueFields;
  /** Disable the map control while Razorpay / gateway payment is active. */
  paymentLocked?: boolean;
  className?: string;
}) {
  const mode = normalizeDeliveryMode(session.deliveryMode);
  const showVenue = hasPhysicalVenue(session);
  const embedUrl = toMapEmbedUrl(session.venueMapLink, session.venueAddress);
  const mapsHref = externalMapUrl(session.venueMapLink, session.venueAddress);
  const venueLine = venueSummaryLine(session);
  const [mapExpanded, setMapExpanded] = useState(false);
  const mapRegionId = useId();

  useEffect(() => {
    setMapExpanded(false);
  }, [session.venueAddress, session.venueMapLink, session.deliveryMode]);

  useEffect(() => {
    if (paymentLocked) setMapExpanded(false);
  }, [paymentLocked]);

  const toggleMap = () => {
    if (paymentLocked || !embedUrl) return;
    setMapExpanded((open) => !open);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-x-6 gap-y-3.5">
        {mode === "online" || mode === "hybrid" ? (
          <span className="flex items-center gap-2 text-[13px] font-medium">
            <Video className="h-[18px] w-[18px] shrink-0 text-primary" />
            {deliveryModeLabel(mode)}
          </span>
        ) : null}

        {mode === "offline" ? (
          <span className="flex items-center gap-2 text-[13px] font-medium">
            <MapPin className="h-[18px] w-[18px] shrink-0 text-primary" />
            {deliveryModeLabel(mode)}
          </span>
        ) : null}

        {showVenue && venueLine ? (
          <VenueMapTrigger
            label={mode === "hybrid" ? "Studio location" : venueLine}
            tooltip={embedUrl ? (mapExpanded ? "Hide map" : "Show map") : "Open in Google Maps"}
            disabled={paymentLocked}
            mapsHref={embedUrl ? null : mapsHref}
            expanded={mapExpanded}
            controlsId={embedUrl ? mapRegionId : undefined}
            onToggle={embedUrl ? toggleMap : undefined}
          />
        ) : null}
      </div>

      {embedUrl && mapExpanded ? (
        <div
          id={mapRegionId}
          role="region"
          aria-label="Studio location map"
          className="overflow-hidden rounded-[14px] border border-primary/15 bg-black/[0.03]"
        >
          <div className="relative aspect-[16/10] w-full min-h-[200px] bg-muted/40 sm:min-h-[240px]">
            <iframe
              title="Studio location map"
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          {mapsHref && !paymentLocked ? (
            <div className="border-t border-primary/10 px-3 py-2">
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Google Maps
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function VenueMapTrigger({
  label,
  tooltip,
  disabled,
  mapsHref,
  expanded,
  controlsId,
  onToggle,
}: {
  label: string;
  tooltip: string;
  disabled: boolean;
  mapsHref: string | null;
  expanded: boolean;
  controlsId?: string;
  onToggle?: () => void;
}) {
  const interactive = !disabled && (onToggle || mapsHref);
  const inner = (
    <span className="flex items-center gap-2 text-[13px] font-medium">
      <MapPin className="h-[18px] w-[18px] shrink-0 text-primary" />
      <span className={cn("text-left", interactive && "underline decoration-primary/30 underline-offset-2")}>
        {label}
      </span>
    </span>
  );

  if (!interactive) {
    return <span className={disabled ? "opacity-60" : undefined}>{inner}</span>;
  }

  const control = onToggle ? (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controlsId}
      className="rounded-md transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      {inner}
    </button>
  ) : (
    <a
      href={mapsHref!}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      {inner}
    </a>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{control}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-center">
        <p className="font-medium">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
