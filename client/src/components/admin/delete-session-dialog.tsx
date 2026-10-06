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
import {
  MAX_TEXT_LENGTH,
  limitTextInput,
  PLACEHOLDER_OWNER_CANCEL_OTP,
  normalizeOwnerCancelOtpInput,
} from "@shared/input-limits";
import {
  isSessionDeleteFormSubmittable,
  sessionDeleteFormBlocker,
} from "@shared/admin-session-actions";

interface DeleteSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionLabel: string;
  bookingCount: number;
  onConfirm: (payload: { reason: string; compensation: string; ownerOtp: string }) => Promise<void>;
}

export function DeleteSessionDialog({
  open,
  onOpenChange,
  sessionLabel,
  bookingCount,
  onConfirm,
}: DeleteSessionDialogProps) {
  const [reason, setReason] = useState("");
  const [ownerOtp, setOwnerOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const booked = bookingCount > 0;

  const reset = () => {
    setReason("");
    setOwnerOtp("");
    setSubmitting(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // Hard-delete is blocked when bookings exist (SPEC-SESSIONS-01 A2).
  const canSubmit =
    !booked && isSessionDeleteFormSubmittable(reason, ownerOtp, 0, "");
  const submitBlocker = booked
    ? "This session has bookings. Use Cancel session instead of hard-delete."
    : sessionDeleteFormBlocker(reason, ownerOtp, 0, "");

  const handleSubmit = async () => {
    if (booked) return;
    setSubmitting(true);
    try {
      await onConfirm({
        reason: reason.trim(),
        compensation: "",
        ownerOtp: normalizeOwnerCancelOtpInput(ownerOtp) || ownerOtp.trim(),
      });
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
          <DialogTitle>
            {booked ? "Cannot hard-delete a booked session" : "Delete session permanently"}
          </DialogTitle>
          <DialogDescription>
            {booked ? (
              <>
                {sessionLabel} has {bookingCount} booking{bookingCount === 1 ? "" : "s"}. Hard-delete
                is blocked. Cancel the session instead so members keep their entitlement and can
                reschedule.
              </>
            ) : (
              <>{sessionLabel} will be permanently deleted. This cannot be undone.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {booked ? (
          <Alert className="border-amber-200 bg-amber-50">
            <ShieldAlert className="h-4 w-4 text-amber-800" />
            <AlertDescription className="text-amber-950 text-sm">
              Close this dialog and use <strong>Cancel session</strong> from the week view.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="border-blue-200 bg-blue-50">
              <ShieldAlert className="h-4 w-4 text-blue-800" />
              <AlertDescription className="text-blue-950 text-sm">
                Only empty sessions (no bookings) can be hard-deleted.
              </AlertDescription>
            </Alert>

            <Alert className="border-amber-200 bg-amber-50">
              <ShieldAlert className="h-4 w-4 text-amber-800" />
              <AlertDescription className="text-amber-950 text-sm">
                <strong>Super admin only.</strong> Use placeholder OTP{" "}
                <strong>{PLACEHOLDER_OWNER_CANCEL_OTP}</strong> after confirming with the studio
                owner.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="delete-reason">Reason for deletion</Label>
                <Textarea
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => setReason(limitTextInput(e.target.value, MAX_TEXT_LENGTH.cancelReason))}
                  rows={3}
                  placeholder="Why is this empty session being removed?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-otp">Owner OTP</Label>
                <Input
                  id="delete-otp"
                  value={ownerOtp}
                  onChange={(e) => setOwnerOtp(normalizeOwnerCancelOtpInput(e.target.value))}
                  placeholder={PLACEHOLDER_OWNER_CANCEL_OTP}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
          {!booked && submitBlocker ? (
            <p className="text-xs text-muted-foreground">{submitBlocker}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {booked ? "Close" : "Cancel"}
            </Button>
            {!booked ? (
              <Button
                variant="destructive"
                disabled={!canSubmit || submitting || Boolean(submitBlocker)}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Deleting…" : "Delete permanently"}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
