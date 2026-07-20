import {
  MANUAL_PAYMENT_SUBMITTED_COPY,
  MANUAL_PAYMENT_SUPPORT_WHATSAPP,
  MANUAL_PAYMENT_SUPPORT_WHATSAPP_HREF,
} from "@shared/manual-payment-ack";

export function ManualPaymentReceivedNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 space-y-3">
      <p className="font-semibold text-base">{MANUAL_PAYMENT_SUBMITTED_COPY.headline}</p>
      <p className="text-sm">{MANUAL_PAYMENT_SUBMITTED_COPY.confirmation}</p>
      <p className="text-sm">
        {MANUAL_PAYMENT_SUBMITTED_COPY.assistance}{" "}
        <a
          href={MANUAL_PAYMENT_SUPPORT_WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline"
        >
          WhatsApp {MANUAL_PAYMENT_SUPPORT_WHATSAPP}
        </a>
        .
      </p>
      <p className="text-xs text-amber-900/80 border-t border-amber-200/80 pt-2">
        Typical verification time: {MANUAL_PAYMENT_SUBMITTED_COPY.verificationTat}.
      </p>
    </div>
  );
}
