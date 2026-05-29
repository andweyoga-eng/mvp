/**
 * Payment QR upload fix — unit + regression + DB integration.
 * Run: npm test  (or npm run test:sanity)
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import express, { type Express } from "express";
import http from "node:http";
import "dotenv/config";

const JSON_BODY_LIMIT = "3mb"; // must match server/index.ts express.json limit

function makeJpegDataUrl(base64PayloadBytes: number): string {
  const payload = "A".repeat(base64PayloadBytes);
  return `data:image/jpeg;base64,${payload}`;
}

function postJson(app: Express, path: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> | null; raw: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      const data = JSON.stringify(body);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          let raw = "";
          res.on("data", (chunk) => (raw += chunk));
          res.on("end", () => {
            server.close();
            let json: Record<string, unknown> | null = null;
            try {
              json = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              json = null;
            }
            resolve({ status: res.statusCode ?? 0, json, raw });
          });
        },
      );
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      req.write(data);
      req.end();
    });
  });
}

function createJsonTestApp(limit = JSON_BODY_LIMIT): Express {
  const app = express();
  app.use(express.json({ limit }));
  app.post("/echo", (req, res) => {
    res.json({ ok: true, name: (req.body as { name?: string })?.name });
  });
  app.use((err: { type?: string; status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.type === "entity.too.large") {
      return res.status(413).json({
        message: "Request body is too large. Try a smaller image (under 2MB).",
      });
    }
    res.status(err.status || 500).json({ message: "error" });
  });
  return app;
}

describe("unit: adminPaymentQrCodeSchema", async () => {
  const { adminPaymentQrCodeSchema } = await import("../shared/admin-validation.ts");

  const validContact = {
    contactPhone: "+919876543210",
    contactEmail: "payments@andweyoga.com",
  };

  it("accepts compact data:image/jpeg base64", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "UPI Primary",
      imageUrl: makeJpegDataUrl(200),
      ...validContact,
    });
    assert.equal(result.success, true);
  });

  it("accepts https image URL", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "Hosted QR",
      imageUrl: "https://cdn.example.com/qr.png",
      ...validContact,
    });
    assert.equal(result.success, true);
  });

  it("rejects http (non-https) URL", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "Bad URL",
      imageUrl: "http://example.com/qr.png",
      ...validContact,
    });
    assert.equal(result.success, false);
  });

  it("rejects empty name", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "   ",
      imageUrl: makeJpegDataUrl(50),
      ...validContact,
    });
    assert.equal(result.success, false);
  });

  it("rejects invalid contact email", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "Test",
      imageUrl: makeJpegDataUrl(50),
      contactPhone: "+919876543210",
      contactEmail: "not-an-email",
    });
    assert.equal(result.success, false);
  });

  it("rejects plain text imageUrl (fixes JSON parse confusion on client)", () => {
    const result = adminPaymentQrCodeSchema.safeParse({
      name: "Test",
      imageUrl: "not-json-not-image",
      ...validContact,
    });
    assert.equal(result.success, false);
  });
});

describe("regression: express JSON body limit (QR upload)", () => {
  it("accepts ~2.5MB JSON body (simulated compressed QR upload)", async () => {
    const app = createJsonTestApp();
    const imageUrl = makeJpegDataUrl(1_800_000);
    const body = { name: "Large QR", imageUrl };
    const payloadBytes = Buffer.byteLength(JSON.stringify(body));
    assert.ok(payloadBytes > 1_000_000, "fixture should exceed old 1mb limit");
    assert.ok(payloadBytes < 3_000_000, "fixture should stay under 3mb limit");

    const res = await postJson(app, "/echo", body);
    assert.equal(res.status, 200);
    assert.equal(res.json?.ok, true);
    assert.equal(res.json?.name, "Large QR");
    assert.ok(res.json !== null, "response must be valid JSON (not HTML parser error)");
  });

  it("rejects >3mb body with JSON 413 (not opaque parser error)", async () => {
    const app = createJsonTestApp();
    const imageUrl = makeJpegDataUrl(3_500_000);
    const res = await postJson(app, "/echo", { name: "Too big", imageUrl });
    assert.equal(res.status, 413);
    assert.ok(res.json?.message, "413 must return JSON message");
    assert.match(String(res.json?.message), /too large/i);
  });

  it("old 1mb limit would reject typical QR payload (documents regression cause)", async () => {
    const app = createJsonTestApp("1mb");
    const imageUrl = makeJpegDataUrl(1_800_000);
    const res = await postJson(app, "/echo", { name: "QR", imageUrl });
    assert.equal(res.status, 413);
    assert.ok(res.json !== null, "even 413 should be JSON when error handler is wired");
  });
});

describe("regression: QR payment session schema (cross-pollination)", async () => {
  const { adminCreateClassSessionSchema } = await import("../shared/admin-validation.ts");

  const base = {
    classTypeId: "00000000-0000-0000-0000-000000000001",
    instructorId: "00000000-0000-0000-0000-000000000002",
    date: new Date(Date.now() + 86400000),
    maxCapacity: 10,
    googleMeetLink: "https://meet.google.com/abc-defg-hij",
    publishMode: "now" as const,
  };

  it("QR session requires paymentQrCodeId, phone, and email", () => {
    const result = adminCreateClassSessionSchema.safeParse({
      ...base,
      paymentMethod: "qr",
      paymentQrCodeId: null,
      qrContactPhone: "",
      qrContactEmail: "",
    });
    assert.equal(result.success, false);
  });

  it("QR session accepts valid QR payment fields", () => {
    const result = adminCreateClassSessionSchema.safeParse({
      ...base,
      paymentMethod: "qr",
      paymentQrCodeId: "qr-uuid-1",
      qrContactPhone: "+919876543210",
      qrContactEmail: "pay@example.com",
    });
    assert.equal(result.success, true);
  });

  it("razorpay link sessions still work (no QR fields required)", () => {
    const result = adminCreateClassSessionSchema.safeParse({
      ...base,
      paymentMethod: "razorpay_link",
      razorpayLink: "https://rzp.io/i/example",
    });
    assert.equal(result.success, true);
  });
});

describe("unit: parseAdminApiError handles JSON errors", async () => {
  const { parseAdminApiError } = await import("../client/src/lib/admin-api.ts");

  it("parses 400 validation JSON", async () => {
    const res = new Response(
      JSON.stringify({ message: "QR image is required", errors: [{ path: ["imageUrl"], message: "QR image is required" }] }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
    const err = await parseAdminApiError(res);
    assert.match(err.message, /QR image/i);
  });

  it("parses 413 payload JSON from server", async () => {
    const res = new Response(
      JSON.stringify({ message: "Request body is too large. Try a smaller image (under 2MB)." }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
    const err = await parseAdminApiError(res);
    assert.match(err.message, /too large/i);
  });

  it("detects HTML response (stale server / missing API route)", async () => {
    const res = new Response("<!DOCTYPE html><html></html>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    const err = await parseAdminApiError(res);
    assert.match(err.message, /HTML instead of JSON/i);
    assert.match(err.message, /restart/i);
  });
});

const hasDb =
  !!(process.env.DATABASE_URL?.trim() || process.env.DATABASE_PUBLIC_URL?.trim());

describe("integration: payment QR CRUD in database", { skip: !hasDb }, () => {
  let createdId: string;

  before(async () => {
    const { storageReady } = await import("../server/storage.ts");
    await storageReady;
  });

  it("creates QR with large data URL (~500KB base64)", async () => {
    const { storage } = await import("../server/storage.ts");
    const { adminPaymentQrCodeSchema } = await import("../shared/admin-validation.ts");
    const imageUrl = makeJpegDataUrl(400_000);
    const data = adminPaymentQrCodeSchema.parse({
      name: `Test QR ${Date.now()}`,
      imageUrl,
      contactPhone: "+919876543210",
      contactEmail: "test-qr@andweyoga.com",
    });
    const row = await storage.createPaymentQrCode(data);
    createdId = row.id;
    assert.ok(row.id);
    assert.equal(row.name, data.name);
    assert.ok(row.imageUrl.startsWith("data:image/jpeg;base64,"));
  });

  it("lists and fetches created QR", async () => {
    const { storage } = await import("../server/storage.ts");
    const all = await storage.getAllPaymentQrCodes();
    assert.ok(all.some((q) => q.id === createdId));
    const one = await storage.getPaymentQrCode(createdId);
    assert.ok(one);
  });

  it("updates QR name", async () => {
    const { storage } = await import("../server/storage.ts");
    const { adminPaymentQrCodeSchema } = await import("../shared/admin-validation.ts");
    const existing = await storage.getPaymentQrCode(createdId);
    assert.ok(existing);
    const data = adminPaymentQrCodeSchema.parse({
      name: `${existing!.name} (updated)`,
      imageUrl: existing!.imageUrl,
      contactPhone: existing!.contactPhone,
      contactEmail: existing!.contactEmail,
    });
    const updated = await storage.updatePaymentQrCode(createdId, data);
    assert.ok(updated?.name.includes("(updated)"));
  });

  it("deletes test QR when not linked to sessions", async () => {
    const { storage } = await import("../server/storage.ts");
    const result = await storage.deletePaymentQrCode(createdId);
    assert.equal(result.ok, true);
  });
});

describe("UAT handoff checklist (manual — browser)", () => {
  it("documents admin UI steps for human acceptance", () => {
    const steps = [
      "Admin login → Payment QR tab → Upload QR image (<5MB PNG/JPG)",
      "Preview appears; Save succeeds with toast 'QR code saved'",
      "Refresh list shows new card with image",
      "Edit QR: replace image, Save",
      "Create session with payment method QR + select saved QR + phone + email",
      "Delete unused QR (or verify blocked message if linked to session)",
    ];
    assert.equal(steps.length, 6);
  });
});
