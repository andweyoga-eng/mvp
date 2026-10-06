import { useEffect, useId, useState } from "react";
import { ExternalLink, MapPin, Video, X } from "lucide-react";
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
  /** Disable map expand while Razorpay / gateway payment is active. */
  paymentLocked?: boolean;
  className?: string;
}) {
  const mode = normalizeDeliveryMode(session.deliveryMode);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [loadIframe, setLoadIframe] = useState(false);
  const mapRegionId = useId();

  const showVenue = hasPhysicalVenue(session);
  const embedUrl = toMapEmbedUrl(session.venueMapLink, session.venueAddress);
  const mapsHref = externalMapUrl(session.venueMapLink, session.venueAddress);
  const venueLine = venueSummaryLine(session);

  useEffect(() => {
    if (paymentLocked) {
      setMapExpanded(false);
      setLoadIframe(false);
    }
  }, [paymentLocked]);

  useEffect(() => {
    setMapExpanded(false);
    setLoadIframe(false);
  }, [session.venueAddress, session.venueMapLink, session.deliveryMode]);

  const openMap = () => {
    if (paymentLocked || !embedUrl) return;
    setMapExpanded(true);
    setLoadIframe(true);
  };

  const closeMap = () => {
    setMapExpanded(false);
    setLoadIframe(false);
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
            tooltipTitle={venueLine}
            tooltipHint={embedUrl ? "Tap to view map on this page" : "Open in Google Maps"}
            disabled={paymentLocked}
            onActivate={embedUrl ? openMap : undefined}
            mapsHref={!embedUrl ? mapsHref : null}
          />
        ) : null}
      </div>

      {mapExpanded && embedUrl ? (
        <div
          id={mapRegionId}
          role="region"
          aria-label="Studio location map"
          className="overflow-hidden rounded-[14px] border border-primary/15 bg-black/[0.03]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-primary/10 px-3 py-2">
            <p className="text-xs font-semibold text-foreground">Studio location</p>
            <button
              type="button"
              onClick={closeMap}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
              aria-label="Close map"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
          </div>
          {venueLine ? (
            <p className="border-b border-primary/10 px-3 py-2 text-xs text-muted-foreground">
              {venueLine}
            </p>
          ) : null}
          <div className="relative aspect-[16/10] w-full min-h-[200px] bg-muted/40 sm:min-h-[240px]">
            {loadIframe ? (
              <iframe
                title="Studio location map"
                src={embedUrl}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : null}
          </div>
          {mapsHref ? (
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
  tooltipTitle,
  tooltipHint,
  disabled,
  onActivate,
  mapsHref,
}: {
  label: string;
  tooltipTitle: string;
  tooltipHint: string;
  disabled: boolean;
  onActivate?: () => void;
  mapsHref: string | null;
}) {
  const inner = (
    <span className="flex items-center gap-2 text-[13px] font-medium">
      <MapPin className="h-[18px] w-[18px] shrink-0 text-primary" />
      <span className={cn("text-left", !disabled && onActivate && "underline decoration-primary/30 underline-offset-2")}>
        {label}
      </span>
    </span>
  );

  if (disabled) {
    return <span className="opacity-60">{inner}</span>;
  }

  if (onActivate) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onActivate}
            className="rounded-md transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {inner}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-center">
          <p className="font-medium">{tooltipTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{tooltipHint}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (mapsHref) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {inner}
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-center">
          <p className="font-medium">{tooltipTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{tooltipHint}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}
