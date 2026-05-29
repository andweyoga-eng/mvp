import { CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export type PaymentConfirmedDetails = {
  bookingId: string;
  className: string;
  instructorName: string;
  sessionDate: string;
};

export function PaymentConfirmedContent({
  details,
  onViewSessions,
  onCancel,
}: {
  details: PaymentConfirmedDetails;
  onViewSessions: () => void;
  onCancel: () => void;
}) {
  const sessionWhen = new Date(details.sessionDate);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-600 shadow-lg">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <p className="text-xl font-semibold text-green-900">Payment confirmed</p>
        <p className="text-base text-green-900/90 leading-relaxed">
          Your payment for <span className="font-semibold">{details.className}</span> is verified.
          Your session is locked in — we&apos;ll nudge you to join about 30 minutes before class.
        </p>
      </div>

      <div className="rounded-lg border border-green-100 bg-white/80 p-3 text-sm text-green-900 space-y-1">
        <p className="font-medium">{details.className}</p>
        <p className="text-green-700">With {details.instructorName}</p>
        <p className="flex items-center gap-2 text-green-800">
          <Clock className="h-4 w-4 shrink-0" />
          {format(sessionWhen, "EEE, MMM d")} · {format(sessionWhen, "h:mm a")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full bg-primary hover:bg-primary/90 !text-white font-bold"
          onClick={onViewSessions}
        >
          View My Sessions
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-green-200 text-green-900 hover:bg-green-50 font-semibold"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function PaymentConfirmedDialog({
  open,
  details,
  onViewSessions,
  onCancel,
  onOpenChange,
}: {
  open: boolean;
  details: PaymentConfirmedDetails;
  onViewSessions: () => void;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto border-2 border-green-200 bg-gradient-to-br from-green-50 via-white to-purple-50">
        <DialogHeader className="text-center sm:text-center space-y-2 sr-only">
          <DialogTitle>Payment confirmed</DialogTitle>
          <DialogDescription>Your payment has been verified.</DialogDescription>
        </DialogHeader>
        <PaymentConfirmedContent
          details={details}
          onViewSessions={onViewSessions}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
