import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WAITLIST_SOURCE_GUEST,
  WAITLIST_SOURCE_REGULAR,
  formatProfileWhatsapp,
  resolveWaitlistMarketingSource,
  waitlistPhoneMatchesProfile,
} from "../shared/waitlist.ts";

const root = join(import.meta.dirname, "..");

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
    assert.equal(waitlistPhoneMatchesProfile("9513022331", "9513022331"), true);
    assert.equal(waitlistPhoneMatchesProfile("+91 9513022331", "9513022331"), true);
    assert.equal(waitlistPhoneMatchesProfile("9876543210", "9513022331"), false);
    assert.equal(waitlistPhoneMatchesProfile("9876543210", ""), true);
  });
});

describe("waitlist seniority", () => {
  it("lists and notifies oldest first, and keeps an existing row in place", () => {
    const storage = readFileSync(join(root, "server/storage.ts"), "utf8");
    const active = storage.slice(storage.indexOf("async getActiveNotifyRequestsByClassTypeId"));
    assert.match(active, /orderBy\(asc\(classTypeNotifyRequests\.createdAt\)\)/);
    assert.match(storage, /if \(existing\[0\]\)/);
    const routes = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(routes, /for \(const row of notifyList\)/);
    const dashboard = readFileSync(join(root, "client/src/pages/dashboard.tsx"), "utf8");
    assert.match(dashboard, /Join Waitlist/);
    assert.match(dashboard, /Welcome to andWeYoga/);
    assert.match(dashboard, /Hey \$\{user\?\.name/);
    assert.match(dashboard, /You had already applied for the/);
    const dialog = readFileSync(join(root, "client/src/components/waitlist-join-dialog.tsx"), "utf8");
    assert.match(dialog, /Sign in with Gmail/);
    assert.doesNotMatch(dialog, /I'll join the waitlist/);
    const pending = readFileSync(join(root, "client/src/lib/pending-waitlist.ts"), "utf8");
    assert.match(pending, /requiresConsent === false/);
    assert.match(pending, /alreadyListed/);
    assert.match(pending, /waitlistPhoneMatchesProfile/);
    assert.match(dashboard, /Update my number for future messages/);
    assert.match(dashboard, /Use this number only for this class/);
  });
});
