/** Member booking API response (POST /api/bookings). */
export interface MemberBookingResult {
  booking: {
    id: string;
    classId: string;
    userId: string | null;
    createdAt: string;
  };
  bookingId: string;
  classId: string;
  className: string;
  instructorName: string;
  sessionDate: string;
  price: string | number | null;
  razorpayLink: string | null;
  googleMeetLink: string | null;
  paymentMethod?: "razorpay_link" | "razorpay_gateway" | "qr" | "razorpay";
  useRazorpayCheckout?: boolean;
  useQrPayment?: boolean;
  qrPayment?: {
    qrCodeName: string;
    qrImageUrl: string;
    contactPhone: string;
    contactEmail: string;
  } | null;
  razorpayKeyId?: string | null;
  paymentRequired?: boolean;
  /** Member checkout session token (logged-in users only) */
  token?: string | null;
  /** Guest trial/drop-in checkout — short-lived booking-scoped token */
  guestCheckoutToken?: string | null;
  isGuestCheckout?: boolean;
}

export interface PaymentVerifyResult {
  success: boolean;
  bookingId: string;
  classId: string;
  className: string;
  instructorName: string;
  sessionDate: string;
  googleMeetLink: string | null;
  paymentStatus: string;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  message?: string;
  isGuestCheckout?: boolean;
}

export function formatSessionPrice(price: string | number | null | undefined): string | null {
  if (price === null || price === undefined || price === "") return null;
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (Number.isNaN(n)) return null;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function openRazorpayPayment(link: string): void {
  window.open(link, "_blank", "noopener,noreferrer");
}

export function isValidPaymentUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Poll server when Razorpay client verify fails but webhook may have confirmed (common with UPI). */
export async function syncPaymentStatusAfterVerifyFailure(
  paymentId: string,
  headers: Record<string, string>,
): Promise<PaymentVerifyResult | null> {
  const attempt = async () => {
    const res = await fetch(`/api/payments/${paymentId}/sync-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      credentials: "include",
    });
    const data = (await res.json()) as PaymentVerifyResult;
    if (!res.ok || !data.success) return null;
    return data;
  };

  const immediate = await attempt();
  if (immediate) return immediate;

  await new Promise((resolve) => setTimeout(resolve, 2000));
  return attempt();
}
