import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { User } from "../shared/schema.ts";
import {
  ensureUserCanAuthenticate,
  isUserActive,
  respondAccountClosed,
} from "../server/account.ts";

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "member@example.com",
    name: "Member",
    password: "hash",
    emailVerified: true,
    isActive: true,
    primaryMobile: null,
    primaryMobileCountryCode: "+91",
    secondaryMobile: null,
    secondaryMobileCountryCode: "+91",
    emergencyMobile: null,
    emergencyMobileCountryCode: "+91",
    healthUpdateText: null,
    healthDocumentUrls: null,
    healthUpdateHistory: null,
    healthUpdateLastModified: null,
    dateOfBirth: null,
    profileCompletionStatus: "incomplete",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("isUserActive", () => {
  it("treats null/undefined isActive as active", () => {
    assert.equal(isUserActive(baseUser({ isActive: undefined as unknown as boolean })), true);
  });

  it("detects admin deactivation", () => {
    assert.equal(isUserActive(baseUser({ isActive: false })), false);
  });
});

describe("ensureUserCanAuthenticate", () => {
  it("passes through active users", async () => {
    const user = baseUser();
    const result = await ensureUserCanAuthenticate(
      {
        userHasErasureHistory: async () => false,
        reopenAccountAfterSelfErasure: async () => undefined,
      },
      user,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.treatAsNewUser, false);
      assert.equal(result.user.id, user.id);
    }
  });

  it("blocks admin-deactivated users without erasure history", async () => {
    const result = await ensureUserCanAuthenticate(
      {
        userHasErasureHistory: async () => false,
        reopenAccountAfterSelfErasure: async () => undefined,
      },
      baseUser({ isActive: false }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "admin_deactivated");
    }
  });

  it("reopens self-erased users and flags fresh onboarding", async () => {
    const reopened = baseUser({ isActive: true, primaryMobile: null });
    const result = await ensureUserCanAuthenticate(
      {
        userHasErasureHistory: async () => true,
        reopenAccountAfterSelfErasure: async () => reopened,
      },
      baseUser({ isActive: false }),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.treatAsNewUser, true);
      assert.equal(result.user.isActive, true);
    }
  });
});

describe("respondAccountClosed", () => {
  it("returns account_closed code", () => {
    let status = 0;
    let body: Record<string, unknown> = {};
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: Record<string, unknown>) {
        body = payload;
      },
    };
    respondAccountClosed(res as never);
    assert.equal(status, 403);
    assert.equal(body.code, "account_closed");
  });
});
