import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapLegacyAccountUrl,
  MY_SESSIONS_UPCOMING_URL,
  myAccountHref,
  anchorFromLegacyTab,
} from "../client/src/lib/account-routes.ts";
import {
  isProfileFieldsSectionComplete,
  isHealthSectionComplete,
} from "../shared/profileCompleteness.ts";
import { HEALTH_NO_CONCERNS_TEXT } from "../shared/health-disclosure.ts";

const root = join(import.meta.dirname, "..");

describe("account routes — single-page anchors", () => {
  it("maps legacy /account paths to /my-account anchors", () => {
    assert.equal(mapLegacyAccountUrl("/account/profile", ""), "/my-account#profile");
    assert.equal(mapLegacyAccountUrl("/account/health", ""), "/my-account#health");
    assert.equal(mapLegacyAccountUrl("/account/payments", ""), "/my-account#payments");
    assert.equal(mapLegacyAccountUrl("/account/subscriptions", ""), "/my-account#payments");
    assert.equal(mapLegacyAccountUrl("/account", "?sessionsTab=upcoming"), "/my-account#sessions");
  });

  it("maps legacy ?tab= query to the matching anchor", () => {
    assert.equal(mapLegacyAccountUrl("/account", "?tab=profile"), "/my-account#profile");
    assert.equal(mapLegacyAccountUrl("/account", "?tab=health"), "/my-account#health");
    assert.equal(anchorFromLegacyTab("subscriptions"), "payments");
    assert.equal(anchorFromLegacyTab("sessions"), "sessions");
    assert.equal(anchorFromLegacyTab("bogus"), null);
  });

  it("exposes the canonical sessions deep-link", () => {
    assert.equal(MY_SESSIONS_UPCOMING_URL, "/my-account#sessions");
    assert.equal(myAccountHref("payments"), "/my-account#payments");
    assert.equal(myAccountHref(), "/my-account");
  });
});

describe("account section completeness", () => {
  const base = {
    emailVerified: true,
    name: "Test User",
    primaryMobile: "9988776655",
    primaryMobileCountryCode: "+91",
    emergencyMobile: "8877665544",
    emergencyMobileCountryCode: "+91",
    healthUpdateText: HEALTH_NO_CONCERNS_TEXT,
  };

  it("tracks profile fields separately from health", () => {
    assert.equal(isProfileFieldsSectionComplete(base), true);
    assert.equal(isHealthSectionComplete(base), true);
    assert.equal(isProfileFieldsSectionComplete({ ...base, name: "" }), false);
    assert.equal(isHealthSectionComplete({ ...base, healthUpdateText: "" }), false);
  });
});

describe("account migration — single page + one drawer", () => {
  it("/my-account is a real page route and /account/* redirects to it", () => {
    const app = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    assert.match(app, /path="\/my-account" component=\{MyAccount\}/);
    assert.match(app, /LegacyAccountRedirect/);
    // The legacy multi-route account app must be gone.
    assert.doesNotMatch(app, /AccountApp/);
    assert.doesNotMatch(app, /MyAccountRedirect/);
  });

  it("My Account page renders all six section anchors", () => {
    const page = readFileSync(join(root, "client/src/pages/my-account.tsx"), "utf8");
    for (const id of ["profile", "health", "sessions", "payments", "preferences", "security"]) {
      assert.match(page, new RegExp(`id="${id}"`), `missing #${id} section`);
    }
    // Payments is one section with Methods + History sub-tabs.
    assert.match(page, /payments-tab-methods/);
    assert.match(page, /payments-tab-history/);
  });

  it("the single account drawer deep-links into the page (no legacy routes)", () => {
    const drawer = readFileSync(join(root, "client/src/components/account-drawer.tsx"), "utf8");
    assert.match(drawer, /myAccountHref\("profile"\)/);
    assert.match(drawer, /myAccountHref\("health"\)/);
    assert.match(drawer, /myAccountHref\("sessions"\)/);
    assert.match(drawer, /myAccountHref\("payments"\)/);
    assert.match(drawer, /Book Sessions/);
    assert.doesNotMatch(drawer, /My Subscriptions/);
    assert.doesNotMatch(drawer, /\/account\//);
  });

  it("navigation no longer has the 'My Dashboard' dropdown — it opens the drawer", () => {
    const nav = readFileSync(join(root, "client/src/components/navigation.tsx"), "utf8");
    assert.match(nav, /AccountDrawer/);
    assert.doesNotMatch(nav, /My Dashboard/);
    assert.doesNotMatch(nav, /\/account\/profile/);
  });
});
