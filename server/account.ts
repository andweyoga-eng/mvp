import type { Response } from "express";
import type { User } from "@shared/schema";
import { ACCOUNT_DEACTIVATED_MESSAGE, CUSTOMER_SUPPORT } from "@shared/support";

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
