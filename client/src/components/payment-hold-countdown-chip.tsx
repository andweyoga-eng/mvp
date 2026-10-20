import { Clock, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentHoldCountdownChipProps {
  timeDisplay: string;
  isWarning: boolean;
  className?: string;
}

export function PaymentHoldCountdownChip({
  timeDisplay,
  isWarning,
  className,
}: PaymentHoldCountdownChipProps) {
  if (isWarning) {
    return (
      <div
        className={cn(
          "flex animate-[pulseRing_2s_ease-in-out_infinite] items-center gap-2.5 rounded-xl border px-3.5 py-[11px]",
          className,
        )}
        style={{
          background: "rgba(217,119,6,0.07)",
          borderColor: "rgba(180,83,9,0.22)",
        }}
      >
        <Timer
          className="h-5 w-5 shrink-0 animate-[blink_1s_ease-in-out_infinite]"
          style={{ color: "#b45309" }}
        />
        <p className="flex-1 text-[13px] font-medium leading-snug" style={{ color: "#92400e" }}>
          Hurry, spot held for{" "}
          <strong className="font-semibold tabular-nums">{timeDisplay}</strong>, complete payment
          to keep it.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex animate-[fadeInUp_0.3s_ease] items-center gap-2.5 rounded-xl border px-3.5 py-[11px]",
        className,
      )}
      style={{
        background: "rgba(52,25,106,0.05)",
        borderColor: "rgba(52,25,106,0.10)",
      }}
    >
      <Clock className="h-5 w-5 shrink-0 text-primary opacity-75" />
      <p className="flex-1 text-[13px] leading-snug text-primary">
        Spot held for{" "}
        <strong className="font-semibold tabular-nums">{timeDisplay}</strong>. Complete payment
        to keep it.
      </p>
    </div>
  );
}
