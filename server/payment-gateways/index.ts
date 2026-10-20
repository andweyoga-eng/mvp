import type { PaymentProviderId } from "@shared/payment-gateway";
import {
  createRazorpayOrder,
  fetchRazorpayPaymentDetails,
  getRazorpayKeyId,
  isRazorpayConfigured,
  rupeesToPaise,
  verifyPaymentSignature,
} from "../razorpay";

export interface CreateOrderParams {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string | null;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface GatewayPaymentDetails {
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  gatewayPaymentMethod: string | null;
  gatewayReference: string;
  invoiceId: string | null;
}

export interface PaymentGatewayAdapter {
  id: PaymentProviderId;
  isConfigured(): boolean;
  getPublicKeyId(): string | null;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  verifyPayment(params: VerifyPaymentParams): boolean;
  fetchPaymentDetails(paymentId: string): Promise<GatewayPaymentDetails>;
}

const razorpayAdapter: PaymentGatewayAdapter = {
  id: "razorpay",
  isConfigured: isRazorpayConfigured,
  getPublicKeyId: getRazorpayKeyId,
  async createOrder(params) {
    const order = await createRazorpayOrder(params);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
    };
  },
  verifyPayment: verifyPaymentSignature,
  fetchPaymentDetails: fetchRazorpayPaymentDetails,
};

const adapters: Record<string, PaymentGatewayAdapter> = {
  razorpay: razorpayAdapter,
};

export function getPaymentGateway(provider: PaymentProviderId): PaymentGatewayAdapter | null {
  return adapters[provider] ?? null;
}

export function getConfiguredCheckoutGateway(): PaymentGatewayAdapter | null {
  if (razorpayAdapter.isConfigured()) return razorpayAdapter;
  return null;
}

export { rupeesToPaise };
