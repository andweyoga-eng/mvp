import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { AdminUser } from "@shared/schema";

// Admin-specific request interface
export interface AdminAuthRequest extends Request {
  admin?: AdminUser;
}

// Generate admin JWT token
export function generateAdminToken(adminId: string): string {
  const secret = process.env.JWT_SECRET || "your-secret-key";
  return jwt.sign({ adminId, type: 'admin' }, secret, { expiresIn: "24h" });
}

// Verify admin JWT token
export function verifyAdminToken(token: string): { adminId: string; type: string } | null {
  try {
    const secret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, secret) as any;
    
    // Ensure this is an admin token
    if (decoded.type !== 'admin') {
      return null;
    }
    
    return { adminId: decoded.adminId, type: decoded.type };
  } catch (error) {
    return null;
  }
}

// Admin authentication middleware
export async function requireAdminAuth(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Admin access required. Please login." });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAdminToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: "Invalid admin token. Please login again." });
    }

    // Get admin user from database using ID from token
    const admin = await storage.getAdminById(decoded.adminId);
    
    if (!admin) {
      return res.status(401).json({ message: "Admin user not found. Please contact system administrator." });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ message: "Internal server error during admin authentication" });
  }
}

// Optional admin auth middleware (doesn't require login)
export async function optionalAdminAuth(req: AdminAuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAdminToken(token);
      
      if (decoded) {
        // TODO: Get admin by ID and set req.admin
      }
    }
    
    next();
  } catch (error) {
    // Silently continue without admin auth
    next();
  }
}

// Admin credential verification helper
export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  try {
    const admin = await storage.verifyAdminCredentials(email, password);
    return admin || null;
  } catch (error) {
    console.error('Error verifying admin credentials:', error);
    return null;
  }
}