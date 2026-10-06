/**
 * Post-login landing and checkout intent resume.
 * Run: npm test
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  reserveHrefFromIntent,
  resolveMemberLandingPath,
  applyPostLoginLandingIfNeeded,
  MEMBER_DASHBOARD_URL,
  MY_ACCOUNT_PROFILE_URL,
} from "../client/src/lib/member-landing.ts";
import {
  setPendingBooking,
  clearPendingBooking,
  getPendingBooking,
} from "../client/src/lib/pending-booking.ts";

function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (_i: number) => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

const completeUser = {
  profileCompletionStatus: "complete" as const,
  emailVerified: true,
  name: "Alex",
  primaryMobile: "9876543210",
  primaryMobileCountryCode: "+91",
  emergencyMobile: "9876543211",
  emergencyMobileCountryCode: "+91",
  healthUpdateText: "None",
};

const incompleteUser = {
  profileCompletionStatus: "incomplete" as const,
  emailVerified: true,
  name: "",
  primaryMobile: "",
  primaryMobileCountryCode: "+91",
  emergencyMobile: "",
  emergencyMobileCountryCode: "+91",
  healthUpdateText: null,
};

describe("reserveHrefFromIntent", () => {
  it("builds session checkout URLs with source", () => {
    assert.equal(
      reserveHrefFromIntent({ sessionId: "sess-1" }, "home"),
      "/reserve?sessionId=sess-1&from=home",
    );
    assert.equal(
      reserveHrefFromIntent({ classTypeId: "type-yin" }, "profile"),
      "/reserve?classTypeId=type-yin&from=profile",
    );
  });
});

describe("applyPostLoginLandingIfNeeded", () => {
  beforeEach(() => {
    (globalThis as { sessionStorage?: Storage }).sessionStorage = createSessionStorageMock();
    clearPendingBooking();
    sessionStorage.removeItem("awy_member_landing_checked_v1");
  });

  it("sends complete members with pending session intent to Reserve", async () => {
    setPendingBooking({ sessionId: "sess-42", scrollTo: "schedule" });
    let target = "";
    await applyPostLoginLandingIfNeeded("/dashboard", (path) => {
      target = path;
    }, completeUser);
    assert.equal(target, "/reserve?sessionId=sess-42&from=login");
    assert.ok(getPendingBooking()?.sessionId === "sess-42");
  });

  it("sends new members with pending intent to onboarding first", async () => {
    setPendingBooking({ sessionId: "sess-42", scrollTo: "schedule" });
    let target = "";
    await applyPostLoginLandingIfNeeded("/dashboard", (path) => {
      target = path;
    }, incompleteUser);
    assert.equal(target, MY_ACCOUNT_PROFILE_URL);
    assert.equal(getPendingBooking()?.sessionId, "sess-42");
  });

  it("sends members without booking intent to the dashboard when complete", async () => {
    let target = "";
    await applyPostLoginLandingIfNeeded("/dashboard", (path) => {
      target = path;
    }, completeUser);
    assert.equal(target, "");
  });

  it("sends incomplete members without booking intent to My Account", async () => {
    let target = "";
    await applyPostLoginLandingIfNeeded("/dashboard", (path) => {
      target = path;
    }, incompleteUser);
    assert.equal(target, MY_ACCOUNT_PROFILE_URL);
  });
});

describe("resolveMemberLandingPath", () => {
  it("returns dashboard for complete profiles", () => {
    assert.equal(resolveMemberLandingPath(completeUser), MEMBER_DASHBOARD_URL);
  });

  it("returns profile onboarding for incomplete profiles", () => {
    assert.equal(resolveMemberLandingPath(incompleteUser), MY_ACCOUNT_PROFILE_URL);
  });
});
