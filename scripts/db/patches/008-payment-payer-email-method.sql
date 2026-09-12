-- Payer email and Razorpay instrument (card/upi/netbanking) for admin payment history

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payer_email TEXT,
  ADD COLUMN IF NOT EXISTS gateway_payment_method VARCHAR(32);
