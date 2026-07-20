import { isAdminSessionPaused } from "@shared/admin-session-actions";
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
  const [compensation, setCompensation] = useState("");
  const [ownerOtp, setOwnerOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setCompensation("");
    setOwnerOtp("");
    setSubmitting(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const canSubmit = isSessionDeleteFormSubmittable(reason, ownerOtp, bookingCount, compensation);
  const submitBlocker = sessionDeleteFormBlocker(reason, ownerOtp, bookingCount, compensation);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        reason: reason.trim(),
        compensation: compensation.trim(),
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
            {bookingCount > 0 ? "Delete session with bookings" : "Delete session permanently"}
          </DialogTitle>
          <DialogDescription>
            {bookingCount > 0 ? (
              <>
                {sessionLabel} has {bookingCount} booking{bookingCount === 1 ? "" : "s"}. This
                permanently removes the session and all related records. Booked members will be
                notified with your reason and compensation details.
              </>
            ) : (
              <>
                {sessionLabel} will be permanently deleted. This cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50">
          <ShieldAlert className="h-4 w-4 text-blue-800" />
          <AlertDescription className="text-blue-950 text-sm">
            Booked members will be notified by <strong>email</strong> (live when configured), plus{" "}
            <strong>SMS</strong> and <strong>WhatsApp</strong> (where consent allows) when channels
            are integrated.
          </AlertDescription>
        </Alert>

        <Alert className="border-amber-200 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-800" />
          <AlertDescription className="text-amber-950 text-sm">
            <strong>Super admin only.</strong> Use placeholder OTP <strong>000000</strong> after
            confirming with the studio owner.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Reason for deletion</Label>
            <Textarea
              id="delete-reason"
              value={reason}
              maxLength={MAX_TEXT_LENGTH.cancelReason}
              onChange={(e) => setReason(limitTextInput(e.target.value, MAX_TEXT_LENGTH.cancelReason))}
              placeholder="e.g. Duplicate session created in error"
              rows={3}
            />
          </div>
          {bookingCount > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="delete-compensation">Compensation for booked members</Label>
              <Textarea
                id="delete-compensation"
                value={compensation}
                maxLength={MAX_TEXT_LENGTH.deleteCompensation}
                onChange={(e) =>
                  setCompensation(limitTextInput(e.target.value, MAX_TEXT_LENGTH.deleteCompensation))
                }
                placeholder="e.g. Full refund within 3 business days, or credit for any upcoming session"
                rows={3}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="delete-owner-otp">Owner OTP (placeholder)</Label>
            <div className="flex gap-2">
              <Input
                id="delete-owner-otp"
                value={ownerOtp}
                maxLength={MAX_TEXT_LENGTH.ownerOtp}
                onChange={(e) =>
                  setOwnerOtp(
                    limitTextInput(normalizeOwnerCancelOtpInput(e.target.value), MAX_TEXT_LENGTH.ownerOtp),
                  )
                }
                placeholder={PLACEHOLDER_OWNER_CANCEL_OTP}
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
                className="font-mono tracking-widest"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setOwnerOtp(PLACEHOLDER_OWNER_CANCEL_OTP)}
              >
                Use {PLACEHOLDER_OWNER_CANCEL_OTP}
              </Button>
            </div>
          </div>
        </div>

        {submitBlocker && !submitting ? (
          <p className="text-xs text-amber-800">{submitBlocker}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Keep session
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting || !canSubmit}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
