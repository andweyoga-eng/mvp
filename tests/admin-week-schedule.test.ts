import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("admin week schedule data source", () => {
  it("uses a week-scoped admin sessions endpoint instead of the paginated sessions list", () => {
    const dashboardSource = readFileSync(join(root, "client/src/pages/admin-dashboard.tsx"), "utf8");

    assert.match(dashboardSource, /\/api\/admin\/classes\/week/);
    assert.match(dashboardSource, /sessions=\{weekSessions\}/);
    assert.match(dashboardSource, /Sessions in this week/);
  });

  it("exposes a dedicated admin week classes route and storage range query", () => {
    const routesSource = readFileSync(join(root, "server/routes.ts"), "utf8");
    const storageSource = readFileSync(join(root, "server/storage.ts"), "utf8");

    assert.match(routesSource, /app\.get\("\/api\/admin\/classes\/week"/);
    assert.match(routesSource, /storage\.getClassesInRange/);
    assert.match(storageSource, /async getClassesInRange\(start: Date, end: Date\)/);
  });
});
