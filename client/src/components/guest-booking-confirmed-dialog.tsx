import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guestSessionDetailsMessage } from "@shared/guest-checkout";

export function GuestBookingConfirmedContent({
  onSignUp,
  onDecline,
  onCancel,
}: {
  onSignUp: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <p className="text-xl font-semibold text-green-900">You&apos;re booked!</p>
        <p className="text-base text-green-900/90 leading-relaxed">
          {guestSessionDetailsMessage()}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full bg-primary hover:bg-primary/90 !text-white font-bold"
          onClick={onSignUp}
        >
          Sign up for future sessions &amp; early access
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-green-200 text-green-900 hover:bg-green-50 font-semibold"
          onClick={onDecline}
        >
          No thanks
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full font-semibold text-muted-foreground"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
