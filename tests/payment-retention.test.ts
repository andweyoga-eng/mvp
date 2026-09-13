import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("payment ledger retention (Companies Act s.128)", () => {
  it("keeps payment rows when hard-deleting a class session", () => {
    const storageSource = readFileSync(join(root, "server/storage.ts"), "utf8");
    const deleteClassDependents = storageSource.match(
      /private async deleteClassDependents\([\s\S]*?\n  \}/,
    )?.[0];
    assert.ok(deleteClassDependents, "deleteClassDependents should exist");
    assert.doesNotMatch(
      deleteClassDependents,
      /db\.delete\(payments\)/,
      "class cascade must not hard-delete payment ledger rows",
    );
    assert.match(
      deleteClassDependents,
      /bookingId:\s*null/,
      "class cascade should detach payments by nulling bookingId",
    );
    assert.match(
      deleteClassDependents,
      /classId:\s*null/,
      "class cascade should detach payments by nulling classId",
    );
  });

  it("keeps payment rows when permanently deleting a user", () => {
    const storageSource = readFileSync(join(root, "server/storage.ts"), "utf8");
    const deleteUserRecords = storageSource.match(
      /private async deleteUserRecordsPermanently\([\s\S]*?\n  \}/,
    )?.[0];
    assert.ok(deleteUserRecords, "deleteUserRecordsPermanently should exist");
    assert.doesNotMatch(
      deleteUserRecords,
      /tx\.delete\(payments\)/,
      "user hard-delete must not hard-delete payment ledger rows",
    );
    assert.match(deleteUserRecords, /userId:\s*null/);
    assert.match(deleteUserRecords, /bookingId:\s*null/);
  });

  it("ships the SQL patch that replaces CASCADE with SET NULL", () => {
    const patchSql = readFileSync(
      join(root, "scripts/db/patches/035-payment-retention.sql"),
      "utf8",
    );
    assert.match(patchSql, /ON DELETE SET NULL/);
    assert.match(patchSql, /ALTER COLUMN booking_id DROP NOT NULL/);
    assert.match(patchSql, /ALTER COLUMN class_id DROP NOT NULL/);
    assert.doesNotMatch(patchSql, /ON DELETE CASCADE/);
  });

  it("models payment FKs as nullable set-null in the Drizzle schema", () => {
    const schemaSource = readFileSync(join(root, "shared/schema.ts"), "utf8");
    const paymentsTable = schemaSource.match(
      /export const payments = pgTable\("payments", \{[\s\S]*?\n\}\);/,
    )?.[0];
    assert.ok(paymentsTable, "payments table should exist");
    assert.match(
      paymentsTable,
      /bookingId: varchar\("booking_id"\)\.references\(\(\) => bookings\.id, \{ onDelete: "set null" \}\)/,
    );
    assert.match(
      paymentsTable,
      /classId: varchar\("class_id"\)\.references\(\(\) => classes\.id, \{ onDelete: "set null" \}\)/,
    );
    assert.doesNotMatch(paymentsTable, /bookingId:.*\.notNull\(\)/);
    assert.doesNotMatch(paymentsTable, /classId:.*\.notNull\(\)/);
  });
});
