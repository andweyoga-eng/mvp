import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

describe("QA ticket batch — sessions & checkout", () => {
  it("drops session-type T&C from checkout and admin session types", () => {
    const reserve = readFileSync(join(root, "client/src/pages/reserve.tsx"), "utf8");
    const modal = readFileSync(join(root, "client/src/components/booking-modal.tsx"), "utf8");
    const admin = readFileSync(
      join(root, "client/src/components/admin/session-types-panel.tsx"),
      "utf8",
    );
    assert.doesNotMatch(reserve, /SessionTermsBlock/);
    assert.doesNotMatch(reserve, /SessionTermsAcceptanceCopy/);
    assert.match(reserve, /CancellationPolicyClickwrap/);
    assert.doesNotMatch(modal, /SessionTermsBlock/);
    assert.doesNotMatch(modal, /SessionTermsAcceptanceCopy/);
    assert.doesNotMatch(admin, /Terms &amp; conditions/);
  });

  it("shows the corner FAB only when the header My Account control is off-screen", () => {
    const controls = readFileSync(
      join(root, "client/src/components/account-menu-controls.tsx"),
      "utf8",
    );
    const reserve = readFileSync(join(root, "client/src/pages/reserve.tsx"), "utf8");
    assert.match(controls, /IntersectionObserver/);
    assert.match(controls, /createPortal/);
    assert.match(controls, /lg:hidden/);
    assert.doesNotMatch(reserve, /alwaysShowFloatingMenu/);
    assert.match(reserve, /max-lg:relative/);
  });

  it("loads month-grid sessions from a month catalog, not the rolling week", () => {
    const dashboard = readFileSync(join(root, "client/src/pages/dashboard.tsx"), "utf8");
    const routes = readFileSync(join(root, "server/routes.ts"), "utf8");
    const storage = readFileSync(join(root, "server/storage.ts"), "utf8");
    assert.match(dashboard, /\/api\/schedule\/month/);
    assert.match(dashboard, /CalendarDaySessionsPanel/);
    assert.match(dashboard, /calendarFocusKey/);
    assert.match(dashboard, /monthSchedule/);
    assert.match(routes, /app\.get\("\/api\/schedule\/month"/);
    assert.match(storage, /async getBookableClassesInRange/);
  });

  it("keeps leave-vs-stay release copy by program count", () => {
    const reserve = readFileSync(join(root, "client/src/pages/reserve.tsx"), "utf8");
    assert.match(reserve, /Release this spot/);
    assert.match(reserve, /Release my spot and leave/);
    assert.match(reserve, /clearPendingBooking/);
    assert.match(reserve, /requestLeave\("home"\)/);
    assert.match(reserve, /armHoldOnProgramPick/);
    assert.match(reserve, /handleReleaseSpot\(!hasMultiplePrograms\)/);
    assert.match(reserve, /confirmLeaveRelease/);
  });
});
