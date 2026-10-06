import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WAITLIST_SOURCE_GUEST,
  WAITLIST_SOURCE_REGULAR,
  formatProfileWhatsapp,
  resolveWaitlistMarketingSource,
} from "../shared/waitlist.ts";

describe("waitlist marketing tags", () => {
  it("maps legacy member sources to WL-R", () => {
    assert.equal(resolveWaitlistMarketingSource("member"), WAITLIST_SOURCE_REGULAR);
    assert.equal(resolveWaitlistMarketingSource("regular"), WAITLIST_SOURCE_REGULAR);
  });

  it("maps legacy guest sources to WL-G", () => {
    assert.equal(resolveWaitlistMarketingSource("guest"), WAITLIST_SOURCE_GUEST);
    assert.equal(resolveWaitlistMarketingSource("public"), WAITLIST_SOURCE_GUEST);
  });

  it("falls back using user id when source is unknown", () => {
    assert.equal(resolveWaitlistMarketingSource("", "user-1"), WAITLIST_SOURCE_REGULAR);
    assert.equal(resolveWaitlistMarketingSource("unknown", null), WAITLIST_SOURCE_GUEST);
  });

  it("formats profile whatsapp from primary mobile", () => {
    assert.equal(
      formatProfileWhatsapp({ primaryMobile: "9513022331", primaryMobileCountryCode: "+91" }),
      "+91 9513022331",
    );
    assert.equal(formatProfileWhatsapp({ primaryMobile: "" }), null);
  });
});
