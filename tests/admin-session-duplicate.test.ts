/**
 * Admin duplicate session — clear date, keep recurrence, publish now.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { withDuplicateSessionDefaults } from "../client/src/lib/admin-session-duplicate.ts";

const root = join(import.meta.dirname, "..");

describe("withDuplicateSessionDefaults", () => {
  it("clears date and publish-later fields without touching recurrence", () => {
    const form = {
      classTypeId: "type-1",
      instructorId: "inst-1",
      date: "2026-06-01T10:00",
      maxCapacity: "20",
      recurrenceKind: "weekly" as const,
      occurrenceCount: "8",
      recurrenceWeekdays: [1, 3, 5],
      flexiEnabled: true,
      publishMode: "later" as const,
      publishAt: "2026-06-01T08:00",
      sessionFrequency: "recurring" as const,
    };

    const duplicated = withDuplicateSessionDefaults(form);

    assert.equal(duplicated.date, "");
    assert.equal(duplicated.publishMode, "now");
    assert.equal(duplicated.publishAt, "");
    assert.equal(duplicated.recurrenceKind, "weekly");
    assert.equal(duplicated.occurrenceCount, "8");
    assert.deepEqual(duplicated.recurrenceWeekdays, [1, 3, 5]);
    assert.equal(duplicated.flexiEnabled, true);
    assert.equal(duplicated.classTypeId, "type-1");
    assert.equal(duplicated.instructorId, "inst-1");
    assert.equal(duplicated.sessionFrequency, "recurring");
  });
});

describe("admin duplicate session wiring", () => {
  it("wires Duplicate through week grid, dashboard, and create modal", () => {
    const grid = readFileSync(
      join(root, "client/src/components/admin/week-schedule-grid.tsx"),
      "utf8",
    );
    const dashboard = readFileSync(join(root, "client/src/pages/admin-dashboard.tsx"), "utf8");
    const modal = readFileSync(
      join(root, "client/src/components/admin/create-session-modal.tsx"),
      "utf8",
    );

    assert.match(grid, /onDuplicateSession/);
    assert.match(grid, /Duplicate/);
    assert.match(dashboard, /openDuplicateSession/);
    assert.match(dashboard, /sessionToDuplicate/);
    assert.match(dashboard, /onDuplicateSession=\{openDuplicateSession\}/);
    assert.match(modal, /sessionToDuplicate/);
    assert.match(modal, /withDuplicateSessionDefaults/);
    assert.match(modal, /Duplicate Session/);
  });
});
