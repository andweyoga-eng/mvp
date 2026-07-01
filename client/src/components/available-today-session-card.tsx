import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AvailableTodaySessionCardProps {
  sessionId: string;
  className: string;
  instructorName: string;
  timeLabel: string;
  price: number | null | undefined;
  imageUrl?: string;
  soldOut: boolean;
  intensityLabel?: string;
  onBook: (sessionId: string) => void;
}

function instructorInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AvailableTodaySessionCard({
  sessionId,
  className,
  instructorName,
  timeLabel,
  price,
  imageUrl,
  soldOut,
  intensityLabel,
  onBook,
}: AvailableTodaySessionCardProps) {
  return (
    <div
      className={cn(
        "flex w-[286px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-transparent bg-muted transition",
        soldOut
          ? "opacity-80 saturate-[0.85]"
          : "hover:border-primary/15 hover:bg-white hover:shadow-dz-ambient",
      )}
    >
      <div
        className="relative flex h-32 shrink-0 items-center justify-center bg-gradient-to-br from-primary/20 to-dz-secondary/30"
        style={
          imageUrl
            ? {
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {intensityLabel ? (
          <span className="absolute left-3 top-3 rounded-lg bg-white/85 px-2.5 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
            {intensityLabel}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-[188px] flex-1 flex-col p-4">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1 text-dz-secondary">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold">{timeLabel}</span>
            </div>
            <h4 className="font-display text-lg font-semibold leading-tight">{className}</h4>
          </div>
          <span className="min-h-[1.25rem] shrink-0 whitespace-nowrap text-right font-bold text-primary">
            {price != null && price > 0 ? `₹${price}` : "\u00a0"}
          </span>
        </div>
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-dz-secondary text-xs font-bold text-white">
            {instructorInitials(instructorName)}
          </div>
          <span className="truncate text-sm text-dz-muted">{instructorName}</span>
        </div>
        <Button
          className={cn(
            "mt-auto w-full rounded-xl font-semibold",
            soldOut
              ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none hover:bg-muted"
              : "bg-primary text-white shadow-dz-primary hover:bg-primary/90",
          )}
          disabled={soldOut}
          onClick={() => onBook(sessionId)}
          data-testid={`book-class-${sessionId}`}
        >
          {soldOut ? "Sold Out" : "Book Now"}
        </Button>
      </div>
    </div>
  );
}
