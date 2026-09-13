import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { getAllowedCorsOrigin, validateEnvironment } from "./startup-security";
import { setupVite, serveStatic, log } from "./vite";

validateEnvironment();
console.log("✅ Environment validation passed");

const app = express();
app.set("trust proxy", 1);

app.use((req, res, next) => {
  const allowedOrigin = getAllowedCorsOrigin();
  const requestOrigin = req.headers.origin;

  if (requestOrigin && requestOrigin !== allowedOrigin) {
    return res.status(403).json({ message: "CORS origin denied." });
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', requestOrigin || allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ============================================================
// SECURITY: Security headers on every response
// ============================================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data: https:",
        "font-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://checkout.razorpay.com https://*.razorpay.com",
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://checkout.razorpay.com https://*.razorpay.com",
        "frame-src https://accounts.google.com https://checkout.razorpay.com https://*.razorpay.com",
      ].join("; "),
    );
  }
  next();
});

// ============================================================
// SECURITY: Cookie parser — required for httpOnly auth cookies
// Install with: npm install cookie-parser @types/cookie-parser
// ============================================================
import cookieParser from 'cookie-parser';
import { handleRazorpayWebhook } from './payment-webhook';
import { checkDatabaseHealth } from './db-health';

app.use(cookieParser());

// Razorpay webhooks require the raw body for signature verification
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook,
);

// Health uploads send base64 in JSON (~33% overhead); allow headroom for 5MB files + other payloads.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: false }));

// Serve static files from attached_assets
app.use('/attached_assets', express.static('attached_assets'));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // SECURITY: Do not log response bodies in production — they may contain sensitive data
      if (process.env.NODE_ENV !== 'production' && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const dbHealth = await checkDatabaseHealth();
  if (!dbHealth.ok) {
    console.error("\n⚠️  Database connection failed at startup.");
    console.error(`   ${dbHealth.error}`);
    console.error(
      "   Admin login and most API routes will not work until DATABASE_URL is valid.",
    );
    console.error(
      "   Fix: In Railway → Postgres → Connect, copy DATABASE_PUBLIC_URL into .env (and webapp vars).\n",
    );
  } else {
    try {
      const { ensureDefaultPlatformSettings } = await import("./platform-settings");
      await ensureDefaultPlatformSettings();
    } catch (err) {
      console.error("[startup] Could not seed default platform settings:", err);
    }
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === "entity.too.large") {
      return res.status(413).json({
        message: "Request body is too large. Try a smaller image (under 2MB).",
      });
    }
    const status = err.status || err.statusCode || 500;
    // SECURITY: Never expose internal error details to clients in production
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : (err.message || "Internal Server Error");

    res.status(status).json({ message });
    if (process.env.NODE_ENV !== 'production') throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Default 3000: macOS often reserves 5000 for AirPlay Receiver; 5000 is also easy to leave occupied by a stray dev server.
  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`🚀 andWeYoga server running on port ${port}`);
    log(`🔒 Security mode: ${process.env.NODE_ENV || 'development'}`);
  });
})();
