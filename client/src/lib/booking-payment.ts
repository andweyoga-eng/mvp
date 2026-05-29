/** Member booking API response (POST /api/bookings). */
export interface MemberBookingResult {
  booking: {
    id: string;
    classId: string;
    userId: string;
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
  /** Issued for guest trial/drop-in checkout so Razorpay payment APIs can authenticate */
  token?: string | null;
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
