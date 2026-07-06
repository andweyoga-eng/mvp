import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_TERMS_AND_CONDITIONS,
  resolveSessionTermsAndConditions,
} from "@shared/session-terms";

describe("resolveSessionTermsAndConditions", () => {
  it("returns trimmed custom terms when set", () => {
    expect(resolveSessionTermsAndConditions("  Custom policy.  ")).toBe("Custom policy.");
  });

  it("falls back to platform default when empty", () => {
    expect(resolveSessionTermsAndConditions("")).toBe(DEFAULT_SESSION_TERMS_AND_CONDITIONS);
    expect(resolveSessionTermsAndConditions(null)).toBe(DEFAULT_SESSION_TERMS_AND_CONDITIONS);
    expect(resolveSessionTermsAndConditions(undefined)).toBe(DEFAULT_SESSION_TERMS_AND_CONDITIONS);
  });
});
