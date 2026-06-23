import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { User } from '@shared/schema';

// SECURITY FIX 1: Fail hard at startup if JWT_SECRET is missing or weak.
// Never fall back to a hardcoded default. A missing secret in production
// means someone can forge tokens. We crash intentionally so the issue
// is caught before any user data is exposed.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }
  if (secret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET is too short. It must be at least 32 characters. ' +
      'Generate a strong one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const SALT_ROUNDS = 12;

export interface AuthRequest extends Request {
  user?: { id: string };
  /** Set when authenticated via a short-lived guest checkout JWT */
  guestCheckoutBookingId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

const GUEST_CHECKOUT_TOKEN_TTL = '2h';

export function generateGuestCheckoutToken(bookingId: string): string {
  return jwt.sign({ bookingId, scope: 'guest_checkout' }, JWT_SECRET, {
    expiresIn: GUEST_CHECKOUT_TOKEN_TTL,
  });
}

export function verifyGuestCheckoutToken(token: string): { bookingId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      bookingId?: string;
      scope?: string;
    };
    if (decoded.scope !== 'guest_checkout' || !decoded.bookingId) return null;
    return { bookingId: decoded.bookingId };
  } catch {
    return null;
  }
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId?: string;
      scope?: string;
    };
    if (decoded.scope === "guest_checkout" || !decoded.userId) return null;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// SECURITY FIX 5: Email verification tokens now include a 24-hour expiry timestamp.
// Format: <random-hex>.<expiry-unix-timestamp>
// This prevents leaked verification links from working indefinitely.
export function generateExpiringVerificationToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
  return `${token}.${expiry}`;
}

export function isVerificationTokenExpired(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false; // old format tokens never expire (backward compat)
  const expiry = parseInt(parts[1], 10);
  return isNaN(expiry) || Date.now() > expiry;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // SECURITY FIX 2: Read token from httpOnly cookie first, then fall back to
    // Authorization header for API clients. This prevents token leakage via URLs.
    const cookieToken = (req as any).cookies?.authToken;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cookieToken = (req as any).cookies?.authToken;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = cookieToken || headerToken;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.userId) {
        req.user = { id: decoded.userId };
      }
    }
    next();
  } catch {
    next();
  }
}

/** Accepts member JWT (cookie/header) or guest checkout JWT (header only). */
export async function requireBookingAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const cookieToken = (req as any).cookies?.authToken;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Guest checkout JWT in Authorization must win over a stale member cookie.
    // Guest flow clears localStorage but the auth cookie may still be sent.
    if (headerToken) {
      const guestDecoded = verifyGuestCheckoutToken(headerToken);
      if (guestDecoded) {
        req.guestCheckoutBookingId = guestDecoded.bookingId;
        return next();
      }
    }

    if (cookieToken) {
      const decoded = verifyToken(cookieToken);
      if (decoded?.userId) {
        req.user = { id: decoded.userId };
        return next();
      }
    }

    if (headerToken) {
      const memberDecoded = verifyToken(headerToken);
      if (memberDecoded) {
        req.user = { id: memberDecoded.userId };
        return next();
      }
    }

    return res.status(401).json({ message: 'Authentication required' });
  } catch {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}
