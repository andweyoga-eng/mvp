import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { memberPaymentAckSchema } from "../shared/schema.ts";
import {
  isValidManualPaymentRef,
  normalizeManualPaymentRefInput,
  MANUAL_PAYMENT_REF_LENGTH,
} from "../shared/manual-payment-ack.ts";

describe("manual payment reference", () => {
  it("normalizes to 4 alphanumeric characters", () => {
    assert.equal(normalizeManualPaymentRefInput(" ab12 "), "ab12");
    assert.equal(normalizeManualPaymentRefInput("AbCdEf"), "AbCd");
  });

  it("validates exact 4 character refs", () => {
    assert.equal(isValidManualPaymentRef("X9Z1"), true);
    assert.equal(isValidManualPaymentRef("ABC"), false);
    assert.equal(isValidManualPaymentRef("AB-2"), false);
  });

  it("schema rejects invalid ack payloads", () => {
    assert.equal(memberPaymentAckSchema.safeParse({ transactionAckNumber: "12" }).success, false);
    assert.equal(
      memberPaymentAckSchema.safeParse({ transactionAckNumber: "AB12" }).success,
      true,
    );
    assert.equal(
      memberPaymentAckSchema.safeParse({ transactionAckNumber: "AB-1" }).success,
      false,
    );
  });

  it("uses 4 character length constant", () => {
    assert.equal(MANUAL_PAYMENT_REF_LENGTH, 4);
  });
});
