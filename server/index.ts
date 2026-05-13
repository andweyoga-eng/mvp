import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// ============================================================
// SECURITY: Validate all required environment variables exist
// before starting the server. Fail loudly and early rather
// than silently using insecure defaults.
// ============================================================
function validateEnvironment() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n⛔ FATAL: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nCreate a .env file or set these in your hosting platform.\n');
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('\n⛔ FATAL: JWT_SECRET is too short. Must be at least 32 characters.\n');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

validateEnvironment();

const app = express();

// ============================================================
// SECURITY: CORS — only allow requests from your own domain
// ============================================================
app.use((req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN
    ? `https://${process.env.ALLOWED_ORIGIN}`
    : '*';

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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
  }
  next();
});

// ============================================================
// SECURITY: Cookie parser — required for httpOnly auth cookies
// Install with: npm install cookie-parser @types/cookie-parser
// ============================================================
import cookieParser from 'cookie-parser';
app.use(cookieParser());

app.use(express.json({ limit: '1mb' })); // Limit body size to prevent large payload attacks
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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
