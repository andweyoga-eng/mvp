import { Hourglass, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutHoldExpiredStateProps {
  onTryAgain: () => void;
}

export function CheckoutHoldExpiredState({ onTryAgain }: CheckoutHoldExpiredStateProps) {
  return (
    <div className="animate-[fadeInUp_0.4s_ease] px-7 py-[52px] text-center">
      <div className="mx-auto mb-[22px] flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary/[0.07]">
        <Hourglass className="h-[38px] w-[38px] text-primary/45" />
      </div>
      <h2 className="mb-2.5 font-display text-[22px] font-bold tracking-tight text-primary">
        Your held spot expired
      </h2>
      <p className="mx-auto mb-7 max-w-[300px] text-[15px] leading-relaxed text-muted-foreground">
        Your spot was released and is back in the pool. Pick a time and try again — it only takes a
        moment.
      </p>
      <Button
        type="button"
        className="inline-flex gap-2 rounded-xl px-7 py-3.5 font-display text-[15px] font-bold"
        onClick={onTryAgain}
      >
        <RefreshCw className="h-5 w-5" />
        Pick a time to try again
      </Button>
    </div>
  );
}
