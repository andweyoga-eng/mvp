import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { AdminUser } from "@shared/schema";
import { ADMIN_AUTH_COOKIE_NAME } from "./auth-cookie";

export interface AdminAuthRequest extends Request {
  admin?: AdminUser;
}

// SECURITY FIX 1: Same strict secret validation as user auth.
// Admin tokens share the JWT_SECRET but are distinguished by a 'type: admin' claim.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set or too short.');
  }
  return secret;
}

export function generateAdminToken(adminId: string): string {
  const secret = getJwtSecret();
  // Admin tokens expire in 8 hours (shorter than user tokens for security)
  return jwt.sign({ adminId, type: 'admin' }, secret, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): { adminId: string; type: string } | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
    // CRITICAL: Always check the type claim to prevent user tokens 
    // being used to access admin endpoints
    if (decoded.type !== 'admin') {
      return null;
    }
    return { adminId: decoded.adminId, type: decoded.type };
  } catch (error) {
    return null;
  }
}

export async function requireAdminAuth(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const cookieToken = (req as any).cookies?.[ADMIN_AUTH_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ message: "Admin access required. Please login." });
    }

    const decoded = verifyAdminToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid admin token. Please login again." });
    }

    const admin = await storage.getAdminById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({ message: "Admin user not found." });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ message: "Internal server error during admin authentication" });
  }
}

/**
 * Middleware that requires the admin to have the 'super_admin' role.
 * Used for destructive or compliance-sensitive actions:
 *   - Re-activating suspended / blacklisted instructors
 *   - Changing instructor operational status (suspend / blacklist)
 * Any valid admin token that is NOT super_admin receives 403.
 */
export async function requireSuperAdminAuth(
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction,
) {
  await requireAdminAuth(req, res, () => {
    if (req.admin?.role !== "super_admin") {
      return res
        .status(403)
        .json({ message: "Super admin access required for this action." });
    }
    next();
  });
}
export async function optionalAdminAuth(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const cookieToken = (req as any).cookies?.[ADMIN_AUTH_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const token = cookieToken || headerToken;
    if (token) {
      const decoded = verifyAdminToken(token);
      if (decoded) {
        const admin = await storage.getAdminById(decoded.adminId);
        if (admin) req.admin = admin;
      }
    }
    next();
  } catch (error) {
    next();
  }
}

export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  try {
    const admin = await storage.verifyAdminCredentials(email, password);
    return admin || null;
  } catch (error) {
    console.error('Error verifying admin credentials:', error);
    return null;
  }
}
