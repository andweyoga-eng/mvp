import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import { openRazorpayPayment } from "@/lib/booking-payment";
import {
  MANUAL_PAYMENT_REF_HINT,
  MANUAL_PAYMENT_REF_LABEL,
  MANUAL_PAYMENT_REF_LENGTH,
  normalizeManualPaymentRefInput,
  isValidManualPaymentRef,
} from "@shared/manual-payment-ack";

export function ManualPaymentReferenceBlock({
  bookingId,
  variant,
  qrPayment,
  paymentLink,
  onSubmitted,
}: {
  bookingId: string;
  variant: "qr" | "payment_link";
  qrPayment?: {
    qrCodeName: string;
    qrImageUrl: string;
    contactPhone: string;
    contactEmail: string;
  };
  paymentLink?: string | null;
  onSubmitted: () => void;
}) {
  const { toast } = useToast();
  const [refInput, setRefInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refValue = normalizeManualPaymentRefInput(refInput);
  const refValid = isValidManualPaymentRef(refInput);

  async function submitReference() {
    if (!refValid) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment-ack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ transactionAckNumber: refValue }),
      });
      const body = await readResponseJson<{ message?: string }>(res);
      if (!res.ok) throw new Error(body.message || "Could not submit reference");
      onSubmitted();
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-white">
      {variant === "qr" && qrPayment ? (
        <>
          <p className="text-sm font-semibold text-purple-600">Pay via {qrPayment.qrCodeName}</p>
          <img
            src={qrPayment.qrImageUrl}
            alt="Payment QR"
            className="mx-auto max-h-56 object-contain"
          />
          {(qrPayment.contactPhone || qrPayment.contactEmail) && (
            <div className="text-sm text-muted-foreground space-y-1">
              {qrPayment.contactPhone && <p>Phone: {qrPayment.contactPhone}</p>}
              {qrPayment.contactEmail && <p>Email: {qrPayment.contactEmail}</p>}
            </div>
          )}
        </>
      ) : null}

      {variant === "payment_link" && paymentLink ? (
        <Button
          type="button"
          variant="outline"
          className="w-full border-purple-200 text-purple-700 font-semibold"
          onClick={() => openRazorpayPayment(paymentLink)}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open payment link
        </Button>
      ) : null}

      <div>
        <Label htmlFor="manual-payment-ref" className="text-sm font-bold text-purple-600">
          {MANUAL_PAYMENT_REF_LABEL} <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">{MANUAL_PAYMENT_REF_HINT}</p>
        <Input
          id="manual-payment-ref"
          value={refInput}
          onChange={(e) => setRefInput(normalizeManualPaymentRefInput(e.target.value))}
          placeholder="e.g. A1b2"
          maxLength={MANUAL_PAYMENT_REF_LENGTH}
          className="font-mono tracking-widest"
          autoComplete="off"
          inputMode="text"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {refValue.length}/{MANUAL_PAYMENT_REF_LENGTH} characters
          {refInput.length > 0 && !refValid ? " — use letters or numbers only" : ""}
        </p>
      </div>

      <Button
        type="button"
        className="w-full bg-green-600 hover:bg-green-700 !text-white font-bold"
        disabled={isSubmitting || !refValid}
        onClick={() => void submitReference()}
      >
        {isSubmitting ? "Submitting…" : "Submit payment reference"}
      </Button>
    </div>
  );
}

export function ManualPaymentSubmittedMessage({
  onViewSessions,
}: {
  onViewSessions: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 space-y-2">
        <p className="font-semibold text-base">Payment reference received</p>
        <p className="text-sm">
          Our team will confirm your session within about <strong>5 minutes</strong> after
          verifying your payment.
        </p>
        <div className="text-sm pt-2 border-t border-amber-200/80">
          <p className="font-medium">Verification hours</p>
          <p>Every day of the week, 6:00 AM to 9:00 PM IST.</p>
        </div>
      </div>
      <Button type="button" className="w-full font-bold" onClick={onViewSessions}>
        View My Sessions
      </Button>
    </div>
  );
}
