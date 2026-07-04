import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { MAX_TEXT_LENGTH, limitTextInput } from "@shared/input-limits";

interface CancelSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionLabel: string;
  bookingCount: number;
  onConfirm: (payload: { reason: string; ownerOtp: string }) => Promise<void>;
}

export function CancelSessionDialog({
  open,
  onOpenChange,
  sessionLabel,
  bookingCount,
  onConfirm,
}: CancelSessionDialogProps) {
  const [reason, setReason] = useState("");
  const [ownerOtp, setOwnerOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setOwnerOtp("");
    setSubmitting(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onConfirm({ reason: reason.trim(), ownerOtp: ownerOtp.trim() });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel session with bookings</DialogTitle>
          <DialogDescription>
            {sessionLabel} has {bookingCount} booking{bookingCount === 1 ? "" : "s"}. Members will
            see this session as cancelled with your reason.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-800" />
          <AlertDescription className="text-amber-950 text-sm">
            <strong>Coming soon:</strong> owner SMS OTP for every admin cancellation. For now, use
            placeholder OTP <strong>000000</strong> after confirming with the studio owner.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancellation</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              maxLength={MAX_TEXT_LENGTH.cancelReason}
              onChange={(e) => setReason(limitTextInput(e.target.value, MAX_TEXT_LENGTH.cancelReason))}
              placeholder="e.g. Instructor unavailable. We will reach out to reschedule"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-otp">Owner OTP (placeholder)</Label>
            <Input
              id="owner-otp"
              value={ownerOtp}
              maxLength={MAX_TEXT_LENGTH.ownerOtp}
              onChange={(e) => setOwnerOtp(limitTextInput(e.target.value, MAX_TEXT_LENGTH.ownerOtp))}
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Keep session
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting || reason.trim().length < 3 || !ownerOtp.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Cancelling…" : "Cancel session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
