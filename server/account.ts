import type { Response } from "express";
import type { User } from "@shared/schema";
import {
  ACCOUNT_CLOSED_MESSAGE,
  ACCOUNT_DEACTIVATED_MESSAGE,
  CUSTOMER_SUPPORT,
} from "@shared/support";

export function isUserActive(user: User): boolean {
  return user.isActive !== false;
}

export function respondAccountDeactivated(res: Response): void {
  res.status(403).json({
    message: ACCOUNT_DEACTIVATED_MESSAGE,
    code: "account_deactivated",
    support: CUSTOMER_SUPPORT,
  });
}

export function respondAccountClosed(res: Response): void {
  res.status(403).json({
    message: ACCOUNT_CLOSED_MESSAGE,
    code: "account_closed",
  });
}

type ErasureAwareStorage = {
  userHasErasureHistory(userId: string): Promise<boolean>;
  reopenAccountAfterSelfErasure(userId: string): Promise<User | undefined>;
};

export type AuthEligibilityResult =
  | { ok: true; user: User; treatAsNewUser: boolean }
  | { ok: false; reason: "admin_deactivated" };

/** Inactive self-erased users may return; admin-deactivated users may not. */
export async function ensureUserCanAuthenticate(
  storage: ErasureAwareStorage,
  user: User,
): Promise<AuthEligibilityResult> {
  if (isUserActive(user)) {
    return { ok: true, user, treatAsNewUser: false };
  }
  const hasErasure = await storage.userHasErasureHistory(user.id);
  if (!hasErasure) {
    return { ok: false, reason: "admin_deactivated" };
  }
  const reopened = await storage.reopenAccountAfterSelfErasure(user.id);
  if (!reopened) {
    return { ok: false, reason: "admin_deactivated" };
  }
  return { ok: true, user: reopened, treatAsNewUser: true };
}
