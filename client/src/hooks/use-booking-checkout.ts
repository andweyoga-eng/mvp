import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth, getAuthHeaders, setAuthToken } from "@/lib/auth";
import { readResponseJson } from "@/lib/queryClient";
import {
  type MemberBookingResult,
  type PaymentVerifyResult,
  isValidPaymentUrl,
  formatSessionPrice,
  openRazorpayPayment,
  syncPaymentStatusAfterVerifyFailure,
  extractBookingHeldUntil,
} from "@/lib/booking-payment";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { clearPendingBooking } from "@/lib/pending-booking";
import {
  PAYMENT_PROCESSING_MESSAGES,
  type PaymentProcessingPhase,
} from "@/lib/payment-processing-messages";
import { TRIAL_DROPIN_MIDSESSION_MESSAGE } from "@shared/booking-eligibility";
import { usePaymentHoldCountdown } from "@/hooks/use-payment-hold-countdown";
import type { FlexiSelection } from "@/components/flexi-selection-builder";

/** Signed-in member checkout state machine. Mirrors the booking-modal member flow. */
export type CheckoutStep =
  | "idle"
  | "pay"
  | "manual-submitted"
  | "payment-confirmed"
  | "already-booked"
  | "next-batch"
  | "failed";

interface BookingError {
  status?: number;
  requiresHealthUpdate?: boolean;
  redirectTo?: string;
  message?: string;
  code?: string;
  nextBatch?: { id?: string; date?: string } | null;
}

interface UseBookingCheckoutOptions {
  /** Called after a fully confirmed (paid) gateway session. */
  onConfirmed?: (outcome: PaymentVerifyResult) => void;
  /** Called when the server requires the member to finish their profile/health. */
  onProfileRequired?: (redirectTo: string) => void;
}

export function useBookingCheckout({
  onConfirmed,
  onProfileRequired,
}: UseBookingCheckoutOptions = {}) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [paymentResult, setPaymentResult] = useState<MemberBookingResult | null>(null);
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentVerifyResult | null>(null);
  const [step, setStep] = useState<CheckoutStep>("idle");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentProcessingPhase | null>(null);
  const [heldUntil, setHeldUntil] = useState<string | null>(null);
  const [alreadyBookedView, setAlreadyBookedView] = useState<{
    className: string;
    instructorName: string;
    sessionDate: string;
  } | null>(null);
  const [nextBatchPrompt, setNextBatchPrompt] = useState<{ id: string; date: string } | null>(null);
  const checkoutSettledRef = useRef(false);

  const holdCountdown = usePaymentHoldCountdown(
    step === "pay" && paymentResult?.paymentRequired !== false ? heldUntil : null,
  );

  const invalidateSessions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/schedule/week"] });
    queryClient.invalidateQueries({ queryKey: ["/api/schedule/month"] });
    queryClient.invalidateQueries({ queryKey: ["/api/class-types-availability/upcoming"] });
    queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });
  }, [queryClient]);

  const reset = useCallback(() => {
    checkoutSettledRef.current = false;
    setPaymentResult(null);
    setPaymentOutcome(null);
    setStep("idle");
    setIsPaying(false);
    setPaymentPhase(null);
    setHeldUntil(null);
    setAlreadyBookedView(null);
    setNextBatchPrompt(null);
  }, []);

  const releaseCheckout = useCallback(async (): Promise<boolean> => {
    const bookingId = paymentResult?.bookingId;
    if (!bookingId) return false;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-checkout`, {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error("Release failed");
      }
      invalidateSessions();
      reset();
      return true;
    } catch {
      toast({
        title: "Could not release spot",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      return false;
    }
  }, [paymentResult, invalidateSessions, reset, toast]);

  const startRazorpayCheckout = useCallback(
    async (booking: MemberBookingResult) => {
      if (!booking.bookingId || !booking.razorpayKeyId) return;
      const payerName = user?.name?.trim();
      const payerEmail = user?.email?.trim();
      if (!payerName || !payerEmail) {
        setIsPaying(false);
        toast({
          title: "Profile incomplete",
          description: "Add your name and verified email before paying.",
          variant: "destructive",
        });
        return;
      }
      setIsPaying(true);
      setPaymentPhase("creating-order");
      try {
        checkoutSettledRef.current = false;
        const orderRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({ bookingId: booking.bookingId }),
        });
        const orderData = await readResponseJson<{
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
          paymentId: string;
          message?: string;
        }>(orderRes);

        if (!orderRes.ok) {
          const authHint =
            orderRes.status === 401
              ? " Your session may have expired. Please sign in and try again."
              : "";
          throw new Error((orderData.message || "Could not start payment") + authHint);
        }

        setPaymentPhase("opening-checkout");
        await openRazorpayCheckout({
          keyId: orderData.keyId,
          orderId: orderData.orderId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "andWeYoga",
          description: booking.className,
          prefill: {
            name: payerName,
            email: payerEmail,
            contact: user?.primaryMobile ?? undefined,
          },
          onModalOpen: () => setPaymentPhase("checkout-open"),
          onSuccess: async (rzp) => {
            checkoutSettledRef.current = true;
            setPaymentPhase("verifying");
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                credentials: "include",
                body: JSON.stringify({
                  paymentId: orderData.paymentId,
                  razorpay_order_id: rzp.razorpay_order_id,
                  razorpay_payment_id: rzp.razorpay_payment_id,
                  razorpay_signature: rzp.razorpay_signature,
                }),
              });
              const verified = await readResponseJson<PaymentVerifyResult>(verifyRes);
              let confirmed = verifyRes.ok && verified.success ? verified : null;
              if (!confirmed) {
                confirmed = await syncPaymentStatusAfterVerifyFailure(
                  orderData.paymentId,
                  getAuthHeaders(),
                );
              }
              if (!confirmed) {
                throw new Error(verified.message || "Payment verification failed");
              }
              setPaymentOutcome(confirmed);
              setHeldUntil(null);
              setStep("payment-confirmed");
              invalidateSessions();
              onConfirmed?.(confirmed);
            } catch (err) {
              setStep("failed");
              toast({
                title: "Payment verification failed",
                description:
                  err instanceof Error ? err.message : "Please try again or contact support.",
                variant: "destructive",
              });
            } finally {
              setIsPaying(false);
              setPaymentPhase(null);
            }
          },
          onDismiss: () => {
            if (checkoutSettledRef.current) return;
            setIsPaying(false);
            setPaymentPhase(null);
            setStep("pay");
            toast({
              title: "Payment not completed",
              description: "Your spot is still reserved. Retry payment when ready.",
            });
          },
        });
      } catch (err) {
        checkoutSettledRef.current = false;
        setIsPaying(false);
        setPaymentPhase(null);
        setStep("failed");
        toast({
          title: "Payment could not start",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [user, toast, invalidateSessions, onConfirmed],
  );

  const bookingMutation = useMutation<
    MemberBookingResult,
    BookingError,
    { classId: string; programId?: string; flexiSelections?: FlexiSelection[] }
  >({
    mutationFn: async (payload) => {
      const { CANCELLATION_POLICY_VERSION } = await import("@shared/cancellation-policy");
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({
          ...payload,
          acceptCancellationPolicy: true,
          cancellationPolicyVersion: CANCELLATION_POLICY_VERSION,
        }),
      });
      const result = await readResponseJson<Record<string, unknown>>(response);

      if (!response.ok) {
        if (response.status === 409 && result.requiresHealthUpdate) {
          throw {
            status: 409,
            requiresHealthUpdate: true,
            redirectTo: (result.redirectTo as string) || "/my-account#profile",
            message: (result.message as string) || "Health profile required",
            code: (result.code as string) || "profile_incomplete",
          };
        }
        if (response.status === 409 && result.code === "session_in_progress_dropin") {
          throw {
            status: 409,
            code: "session_in_progress_dropin",
            message: (result.message as string) || TRIAL_DROPIN_MIDSESSION_MESSAGE,
          };
        }
        if (response.status === 409 && result.code === "already_booked") {
          throw {
            status: 409,
            code: "already_booked",
            message: (result.message as string) || "You have already booked this session.",
          };
        }
        if (
          response.status === 409 &&
          (result.code === "NO_ACTIVE_PROGRAM" ||
            result.code === "PROGRAM_REQUIRED" ||
            result.code === "TRIAL_ALREADY_USED")
        ) {
          throw {
            status: 409,
            code: typeof result.code === "string" ? result.code : "PROGRAM_REQUIRED",
            message: (result.message as string) || "Choose a program to continue.",
          };
        }
        const zodErrors = result.errors as Array<{ message?: string }> | undefined;
        throw {
          status: response.status,
          message:
            zodErrors?.[0]?.message ||
            (result.message as string) ||
            `Request failed with status ${response.status}`,
          code: typeof result.code === "string" ? result.code : undefined,
          nextBatch:
            result.nextBatch && typeof result.nextBatch === "object"
              ? (result.nextBatch as { id?: string; date?: string })
              : undefined,
        };
      }
      return result as unknown as MemberBookingResult;
    },
    onSuccess: async (result) => {
      clearPendingBooking();
      invalidateSessions();
      if (result.token) setAuthToken(result.token);
      if (result.token) await refreshUser();

      const hold = extractBookingHeldUntil(result);
      setHeldUntil(hold);

      const needsPayment =
        result.useRazorpayCheckout ||
        result.useQrPayment ||
        isValidPaymentUrl(result.razorpayLink) ||
        result.paymentRequired;

      if (needsPayment) {
        setPaymentResult(result);
        setStep("pay");
        if (result.useRazorpayCheckout && result.razorpayKeyId) {
          setIsPaying(true);
          void startRazorpayCheckout(result);
        }
        return;
      }

      setPaymentResult(result);
      setStep("payment-confirmed");
      setPaymentOutcome({
        success: true,
        bookingId: result.bookingId,
        classId: result.classId,
        className: result.className,
        instructorName: result.instructorName,
        sessionDate: result.sessionDate,
        googleMeetLink: result.googleMeetLink,
        paymentStatus: "waived",
        receiptUrl: null,
        invoiceUrl: null,
      });
    },
    onError: (error) => {
      if (error.status === 409 && error.requiresHealthUpdate) {
        toast({
          title: "Profile incomplete",
          description:
            "Please complete your profile (name, mobiles, verified email, and Health History) to book sessions.",
          variant: "destructive",
        });
        onProfileRequired?.(error.redirectTo || "/my-account#profile");
        return;
      }
      if (error.status === 409 && error.code === "already_booked") {
        setStep("already-booked");
        return;
      }
      if (error.status === 409 && error.code === "session_in_progress_dropin") {
        toast({
          title: "Join the next session",
          description: error.message || TRIAL_DROPIN_MIDSESSION_MESSAGE,
        });
        return;
      }
      if (error.status === 409 && error.code === "next_batch_only") {
        const nb = error.nextBatch;
        setNextBatchPrompt(nb?.id && nb?.date ? { id: nb.id, date: nb.date } : null);
        setStep("next-batch");
        return;
      }
      toast({
        title: "Booking failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const startBooking = useCallback(
    (
      classId: string,
      options?: { flexiSelections?: FlexiSelection[]; programId?: string },
    ) => {
      if (bookingMutation.isPending || isPaying) return;
      bookingMutation.mutate({
        classId,
        ...(options?.programId ? { programId: options.programId } : {}),
        ...(options?.flexiSelections?.length ? { flexiSelections: options.flexiSelections } : {}),
      });
    },
    [bookingMutation, isPaying],
  );

  const retryPayment = useCallback(() => {
    if (!paymentResult) return;
    setStep("pay");
    if (paymentResult.useRazorpayCheckout) {
      void startRazorpayCheckout(paymentResult);
    } else if (isValidPaymentUrl(paymentResult.razorpayLink)) {
      openRazorpayPayment(paymentResult.razorpayLink);
    }
  }, [paymentResult, startRazorpayCheckout]);

  const markManualSubmitted = useCallback(() => {
    setStep("manual-submitted");
    queryClient.invalidateQueries({ queryKey: ["/api/sessions/my"] });
  }, [queryClient]);

  const joinNextBatch = useCallback(() => {
    if (!nextBatchPrompt?.id) return;
    const id = nextBatchPrompt.id;
    setNextBatchPrompt(null);
    setStep("idle");
    bookingMutation.mutate({ classId: id });
  }, [nextBatchPrompt, bookingMutation]);

  return {
    step,
    paymentResult,
    paymentOutcome,
    isPaying,
    paymentPhase,
    heldUntil,
    holdCountdown,
    processingCopy: paymentPhase ? PAYMENT_PROCESSING_MESSAGES[paymentPhase] : null,
    alreadyBookedView,
    setAlreadyBookedView,
    nextBatchPrompt,
    isReserving: bookingMutation.isPending,
    startBooking,
    startRazorpayCheckout,
    retryPayment,
    markManualSubmitted,
    joinNextBatch,
    releaseCheckout,
    reset,
    formatSessionPrice,
  };
}
