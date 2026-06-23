import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapLegacyMyAccountUrl,
  MY_SESSIONS_UPCOMING_URL,
  getAccountSectionFromPath,
} from "../client/src/lib/account-routes.ts";
import {
  isProfileFieldsSectionComplete,
  isHealthSectionComplete,
} from "../shared/profileCompleteness.ts";
import { HEALTH_NO_CONCERNS_TEXT } from "../shared/health-disclosure.ts";

const root = join(import.meta.dirname, "..");

describe("account routes", () => {
  it("maps legacy tab URLs to /account paths", () => {
    assert.equal(mapLegacyMyAccountUrl("/my-account", "?tab=profile"), "/account/profile");
    assert.equal(mapLegacyMyAccountUrl("/my-account", "?tab=health"), "/account/health");
    assert.equal(
      mapLegacyMyAccountUrl("/my-account", "?tab=sessions&sessionsTab=upcoming"),
      "/account?sessionsTab=upcoming",
    );
    assert.equal(MY_SESSIONS_UPCOMING_URL, "/account?sessionsTab=upcoming");
  });

  it("resolves account sections from pathname", () => {
    assert.equal(getAccountSectionFromPath("/account"), "sessions");
    assert.equal(getAccountSectionFromPath("/account/profile"), "profile");
    assert.equal(getAccountSectionFromPath("/account/health"), "health");
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
    assert.equal(
      isProfileFieldsSectionComplete({ ...base, name: "" }),
      false,
    );
    assert.equal(
      isHealthSectionComplete({ ...base, healthUpdateText: "" }),
      false,
    );
  });
});

describe("account navigation UI structure", () => {
  it("removes horizontal tabs from account pages", () => {
    const accountApp = readFileSync(join(root, "client/src/pages/account/index.tsx"), "utf8");
    assert.doesNotMatch(accountApp, /TabsList/);
    assert.match(accountApp, /AccountHeader/);
    assert.match(accountApp, /AccountSidebar/);
  });

  it("lists menu items in spec order with plural subscriptions label", () => {
    const menu = readFileSync(
      join(root, "client/src/components/account/account-menu-items.tsx"),
      "utf8",
    );
    assert.match(menu, /My Profile/);
    assert.match(menu, /Health Update/);
    assert.match(menu, /My Subscriptions/);
    assert.match(menu, /Payment History/);
    assert.doesNotMatch(menu, /My Subscription[^s]/);
  });

  it("registers /account routes and legacy redirect", () => {
    const app = readFileSync(join(root, "client/src/App.tsx"), "utf8");
    assert.match(app, /path="\/account\/profile"/);
    assert.match(app, /path="\/my-account"/);
    assert.match(app, /MyAccountRedirect/);
  });
});
