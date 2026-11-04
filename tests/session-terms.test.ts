import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SESSION_TERMS_AND_CONDITIONS,
  resolveSessionTermsAndConditions,
} from "../shared/session-terms.ts";

describe("resolveSessionTermsAndConditions", () => {
  it("returns trimmed custom terms when set", () => {
    assert.equal(resolveSessionTermsAndConditions("  Custom policy.  "), "Custom policy.");
  });

  it("falls back to platform default when empty", () => {
    assert.equal(resolveSessionTermsAndConditions(""), DEFAULT_SESSION_TERMS_AND_CONDITIONS);
    assert.equal(resolveSessionTermsAndConditions(null), DEFAULT_SESSION_TERMS_AND_CONDITIONS);
    assert.equal(resolveSessionTermsAndConditions(undefined), DEFAULT_SESSION_TERMS_AND_CONDITIONS);
  });
});
