/**
 * "Keep me signed in" — verifies the auth cookie lifetime logic that both the
 * email/password and Google OAuth flows (server/routes.ts, server/googleAuth.ts)
 * delegate to. ON → persistent 7-day cookie; OFF → session cookie (no maxAge).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_COOKIE_MAX_AGE_MS,
  OAUTH_KEEP_COOKIE_MAX_AGE_MS,
  buildAuthCookieOptions,
  buildOAuthKeepCookieOptions,
  keepSignedInFromValue,
} from "../server/auth-cookie.ts";

describe("keepSignedInFromValue (default ON; only explicit '0' opts out)", () => {
  it("defaults to true when the preference is absent", () => {
    assert.equal(keepSignedInFromValue(undefined), true);
    assert.equal(keepSignedInFromValue(null), true);
    assert.equal(keepSignedInFromValue(""), true);
  });

  it("is true when explicitly kept ('1')", () => {
    assert.equal(keepSignedInFromValue("1"), true);
  });

  it("is false only for the explicit opt-out '0'", () => {
    assert.equal(keepSignedInFromValue("0"), false);
  });
});

describe("buildAuthCookieOptions", () => {
  it("persistent → 7-day maxAge, httpOnly, sameSite lax", () => {
    const opts = buildAuthCookieOptions(true, false);
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.maxAge, AUTH_COOKIE_MAX_AGE_MS);
    assert.equal(AUTH_COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000);
  });

  it("not persistent → session cookie with NO maxAge", () => {
    const opts = buildAuthCookieOptions(false, false);
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.equal("maxAge" in opts, false, "session cookie must omit maxAge");
    assert.equal(opts.maxAge, undefined);
  });

  it("secure flag follows the production flag", () => {
    assert.equal(buildAuthCookieOptions(true, true).secure, true);
    assert.equal(buildAuthCookieOptions(true, false).secure, false);
  });
});

describe("buildOAuthKeepCookieOptions", () => {
  it("is a short-lived httpOnly cookie that survives the OAuth round-trip", () => {
    const opts = buildOAuthKeepCookieOptions(false);
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.maxAge, OAUTH_KEEP_COOKIE_MAX_AGE_MS);
    assert.equal(OAUTH_KEEP_COOKIE_MAX_AGE_MS, 10 * 60 * 1000);
  });
});

describe("Google OAuth round-trip (start → callback) cookie outcome", () => {
  // Mirrors server/routes.ts: start stores keep, callback reads it and sets auth cookie.
  function roundTrip(keepQuery: unknown): { keepCookieValue: string; authPersistent: boolean } {
    const keepAtStart = keepSignedInFromValue(keepQuery);
    const keepCookieValue = keepAtStart ? "1" : "0"; // value stashed in awy_oauth_keep
    const keepAtCallback = keepSignedInFromValue(keepCookieValue);
    const authOpts = buildAuthCookieOptions(keepAtCallback, false);
    return { keepCookieValue, authPersistent: "maxAge" in authOpts };
  }

  it("keep=1 → persistent auth cookie", () => {
    const r = roundTrip("1");
    assert.equal(r.keepCookieValue, "1");
    assert.equal(r.authPersistent, true);
  });

  it("keep absent → persistent auth cookie (default ON)", () => {
    const r = roundTrip(undefined);
    assert.equal(r.keepCookieValue, "1");
    assert.equal(r.authPersistent, true);
  });

  it("keep=0 → session auth cookie (cleared on browser close)", () => {
    const r = roundTrip("0");
    assert.equal(r.keepCookieValue, "0");
    assert.equal(r.authPersistent, false);
  });
});
