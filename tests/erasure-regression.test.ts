import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { accountErasureSchema } from "../shared/consent.ts";
import { ERASURE_GRACE_DAYS } from "../server/consent.ts";

const root = join(import.meta.dirname, "..");

describe("erasure regression contracts", () => {
  it("keeps the exact ERASE confirmation contract aligned across server and client", () => {
    assert.equal(
      accountErasureSchema.safeParse({
        confirmation: "ERASE",
        acknowledged: true,
      }).success,
      true,
    );
    assert.equal(
      accountErasureSchema.safeParse({
        confirmation: "erase",
        acknowledged: true,
      }).success,
      false,
    );

    const clientApi = readFileSync(join(root, "client/src/lib/consent-api.ts"), "utf8");
    const privacyPanel = readFileSync(
      join(root, "client/src/components/privacy-consent-section.tsx"),
      "utf8",
    );

    assert.match(clientApi, /confirmation: "ERASE"/);
    assert.match(privacyPanel, /erasureConfirm !== "ERASE"/);
  });

  it("pins the 30-day erasure timeline across code and legal copy", () => {
    const routeSource = readFileSync(join(root, "server/consent-routes.ts"), "utf8");
    const sharedCopy = readFileSync(join(root, "shared/consent.ts"), "utf8");
    const grievancePage = readFileSync(join(root, "client/src/pages/grievance.tsx"), "utf8");

    assert.equal(ERASURE_GRACE_DAYS, 30);
    assert.match(routeSource, /timelineDays: ERASURE_GRACE_DAYS/);
    assert.match(sharedCopy, /within 30 days/);
    assert.match(grievancePage, /within 30 days/);
  });

  it("wires the due-erasure executor into startup scheduling", () => {
    const routeSource = readFileSync(join(root, "server/routes.ts"), "utf8");
    assert.match(routeSource, /processDueAccountErasures/);
    assert.match(routeSource, /5 \* 60 \* 1000/);
  });

  it("keeps the erasure executor patch that allows completed requests to outlive deleted users", () => {
    const erasurePatchSql = readFileSync(
      join(root, "scripts/db/patches/023-erasure-executor.sql"),
      "utf8",
    );
    const consentRetentionPatchSql = readFileSync(
      join(root, "scripts/db/patches/024-consent-log-retention.sql"),
      "utf8",
    );
    assert.match(erasurePatchSql, /ALTER COLUMN user_id DROP NOT NULL/);
    assert.match(erasurePatchSql, /erasure_requests_status_schedule_idx/);
    assert.match(consentRetentionPatchSql, /DROP CONSTRAINT IF EXISTS consent_audit_logs_actor_check/);
    assert.match(consentRetentionPatchSql, /user_id IS NULL AND booking_id IS NULL/);
  });
});
