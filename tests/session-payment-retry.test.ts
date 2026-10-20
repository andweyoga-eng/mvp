/**
 * Payment retry from Upcoming tab — create-order → Razorpay → verify.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bindFetch,
  canRetrySessionPayment,
  paymentRetryCreateOrderBody,
  paymentRetryVerifyBody,
  retrySessionPayment,
} from "../client/src/lib/session-payment-retry.ts";

describe("bindFetch", () => {
  it("allows fetch when referenced from a deps object (avoids Illegal invocation)", async () => {
    const depsFetch = bindFetch();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50);
    try {
      await depsFetch("about:blank", { signal: controller.signal });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      assert.equal(message.includes("Illegal invocation"), false, message);
    } finally {
      clearTimeout(timeout);
    }
  });
});

describe("canRetrySessionPayment", () => {
  it("is true only for upcoming sessions with pending payment", () => {
    assert.equal(
      canRetrySessionPayment({ status: "upcoming", paymentStatus: "pending" }),
      true,
    );
    assert.equal(canRetrySessionPayment({ status: "upcoming", paymentStatus: "paid" }), false);
    assert.equal(canRetrySessionPayment({ status: "completed", paymentStatus: "pending" }), false);
    assert.equal(canRetrySessionPayment({ status: "cancelled", paymentStatus: "pending" }), false);
  });
});

describe("paymentRetryCreateOrderBody", () => {
  it("sends bookingId for POST /api/payments/create-order", () => {
    assert.deepEqual(paymentRetryCreateOrderBody("booking-uuid-1"), {
      bookingId: "booking-uuid-1",
    });
  });
});

describe("retrySessionPayment flow", () => {
  it("calls create-order then verify after Razorpay success", async () => {
    const calls: { url: string; body?: unknown }[] = [];
    let razorpayOpened = false;
    let paid = false;

    const fetchMock = (async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (url === "/api/payments/create-order") {
        return new Response(
          JSON.stringify({
            orderId: "order_test",
            amount: 50000,
            currency: "INR",
            keyId: "rzp_test_key",
            paymentId: "pay_test",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/payments/verify") {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const openRazorpayMock = async (opts: {
      onSuccess: (rzp: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => void | Promise<void>;
    }) => {
      razorpayOpened = true;
      await opts.onSuccess({
        razorpay_order_id: "order_test",
        razorpay_payment_id: "pay_rzp",
        razorpay_signature: "sig_test",
      });
    };

    await retrySessionPayment(
      { bookingId: "booking-uuid-1", className: "Warrior Yoga" },
      {
        fetch: fetchMock,
        openRazorpayCheckout: openRazorpayMock as never,
        getAuthHeaders: () => ({ Authorization: "Bearer test-token" }),
        readResponseJson: async (res) => res.json(),
        onPaid: () => {
          paid = true;
        },
        onDismiss: () => {},
        onError: () => {
          assert.fail("onError should not run");
        },
      },
    );

    assert.equal(calls.length, 2);
    assert.equal(calls[0]!.url, "/api/payments/create-order");
    assert.deepEqual(calls[0]!.body, paymentRetryCreateOrderBody("booking-uuid-1"));
    assert.equal(razorpayOpened, true);
    assert.equal(calls[1]!.url, "/api/payments/verify");
    assert.deepEqual(
      calls[1]!.body,
      paymentRetryVerifyBody("pay_test", {
        razorpay_order_id: "order_test",
        razorpay_payment_id: "pay_rzp",
        razorpay_signature: "sig_test",
      }),
    );
    assert.equal(paid, true);
  });

  it("surfaces create-order errors via onError", async () => {
    let errorMessage = "";
    const fetchMock = (async () =>
      new Response(JSON.stringify({ message: "Booking not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    await retrySessionPayment(
      { bookingId: "missing", className: "Flow" },
      {
        fetch: fetchMock,
        openRazorpayCheckout: (async () => {}) as never,
        getAuthHeaders: () => ({}),
        readResponseJson: async (res) => res.json(),
        onPaid: () => {},
        onDismiss: () => {},
        onError: (message) => {
          errorMessage = message;
        },
      },
    );

    assert.equal(errorMessage, "Booking not found");
  });
});
