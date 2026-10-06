import type { Booking } from "@shared/schema";
import type { AuthRequest } from "./auth";

export function canAccessBooking(req: AuthRequest, booking: Booking): boolean {
  if (req.user?.id && booking.userId === req.user.id) return true;
  if (
    req.guestCheckoutBookingId &&
    booking.id === req.guestCheckoutBookingId &&
    booking.isGuestCheckout
  ) {
    return true;
  }
  return false;
}

export function bookingContactName(booking: Booking): string {
  return booking.guestName?.trim() || "";
}

export function bookingContactEmail(booking: Booking): string {
  return booking.guestEmail?.trim().toLowerCase() || "";
}

export function bookingContactPhone(booking: Booking): string | null {
  return booking.guestPhone?.trim() || null;
}
