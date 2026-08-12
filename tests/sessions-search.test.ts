import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { localSessionsSearchProvider } from "../client/src/lib/sessions-search/local-provider.ts";
import { scoreSearchMatch } from "../client/src/lib/sessions-search/match.ts";

const root = join(import.meta.dirname, "..");

const richCatalog = {
  bookedSessions: [
    {
      bookingId: "b1",
      className: "Hatha Yoga",
      instructorName: "Mudit Arun",
      date: "2026-07-15T14:00:00.000Z",
      status: "upcoming",
    },
  ],
  scheduleSessions: [
    {
      id: "s1",
      className: "Sound Therapy",
      classDescription: "Healing sounds and vibration for deep relaxation.",
      instructorName: "Priya",
      date: "2026-07-16T10:00:00.000Z",
      soldOut: false,
    },
    {
      id: "s2",
      className: "Shasti+",
      classDescription: "Strength and flexibility for seniors. Gentle mobility and balance.",
      instructorName: "Mudit Arun",
      date: "2026-07-17T10:00:00.000Z",
      soldOut: false,
    },
  ],
  todaySessions: [
    {
      id: "t1",
      className: "test flexi",
      classDescription: "Flexible booking window.",
      instructorName: "Mudit Arun",
      date: "2026-07-14T14:30:00.000Z",
      soldOut: false,
    },
  ],
  classTypes: [
    {
      id: "ct1",
      name: "Sound Therapy",
      description: "Restorative sound bowls and healing vibration practice.",
      duration: 60,
      intensity: "Gentle",
    },
    {
      id: "ct2",
      name: "Shasti+",
      description: "Strength and flexibility program for seniors and older adults.",
      duration: 45,
      intensity: "Moderate",
    },
  ],
  mentors: [{ name: "Mudit Arun", specialty: "Hatha", bio: "Movement advocate" }],
  publicCoaches: [
    {
      id: "i1",
      name: "Priya Sharma",
      bio: "Vinyasa specialist and breathwork facilitator",
      specialties: ["Vinyasa", "Breathwork"],
    },
  ],
};

describe("sessions search — match scoring", () => {
  it("scores multi-word queries across body text", () => {
    const score = scoreSearchMatch("strength flexibility seniors", {
      title: "Shasti+",
      body: "Strength and flexibility program for seniors and older adults.",
      keywords: ["shasti", "mobility"],
    });
    assert.ok(score > 0);
  });
});

describe("sessions search — local provider", () => {
  it("finds Shasti+ for seniors and flexibility query", () => {
    const results = localSessionsSearchProvider.search(
      "strength and flexibility for seniors",
      richCatalog,
    );
    assert.ok(
      results.some(
        (r) =>
          r.title.includes("Shasti") ||
          r.subtitle?.toLowerCase().includes("senior") ||
          r.id === "tag-shasti-plus",
      ),
    );
  });

  it("finds sound therapy from class and site content", () => {
    const results = localSessionsSearchProvider.search("sound therapy", richCatalog);
    assert.ok(results.some((r) => r.kind === "class_type" || r.kind === "site_content"));
  });

  it("surfaces coach section and public coaches for coach query", () => {
    const results = localSessionsSearchProvider.search("coach", richCatalog);
    assert.ok(results.some((r) => r.kind === "coach" || r.id === "coaches-section"));
  });

  it("returns all booking mentors for my coaches query", () => {
    const results = localSessionsSearchProvider.search("my coaches", richCatalog);
    assert.ok(results.some((r) => r.kind === "my_mentor"));
  });

  it("matches help topics", () => {
    const results = localSessionsSearchProvider.search("refund receipt", richCatalog);
    assert.ok(results.some((r) => r.kind === "help" && r.id === "help-payments"));
  });
});

describe("unified Sessions tab", () => {
  it("removes Calendar launcher tab and redirects /calendar", () => {
    const shell = readFileSync(join(root, "client/src/components/dashboard/dashboard-shell.tsx"), "utf8");
    const calendar = readFileSync(join(root, "client/src/pages/calendar.tsx"), "utf8");
    const drawer = readFileSync(join(root, "client/src/components/account-drawer.tsx"), "utf8");

    assert.doesNotMatch(shell, /id: "calendar"/);
    assert.match(shell, /grid-cols-4/);
    assert.match(shell, /label: "WeFuel"/);
    assert.match(shell, /label: "WeBuild"/);
    assert.match(shell, /label: "WeEmo"/);
    assert.match(shell, /label: "andWeYOGa"/);
    assert.match(shell, /focusSessionsSearch/);
    assert.match(calendar, /setLocation\("\/dashboard"/);
    assert.match(drawer, /href: "\/dashboard"/);
  });

  it("dashboard composes search, schedule, calendar, and mentors", () => {
    const dashboard = readFileSync(join(root, "client/src/pages/dashboard.tsx"), "utf8");
    assert.match(dashboard, /SessionsSearchBar/);
    assert.match(dashboard, /WeeklySchedulePanel/);
    assert.match(dashboard, /PracticeCalendarPanel/);
    assert.match(dashboard, /YourMentorsSection/);
    assert.match(dashboard, /publicCoaches/);
    assert.match(dashboard, /description: ct.description/);
  });

  it("ships a site content search index", () => {
    const index = readFileSync(
      join(root, "client/src/lib/sessions-search/site-content-index.ts"),
      "utf8",
    );
    assert.match(index, /tag-shasti-plus/);
    assert.match(index, /coaches-section/);
    assert.match(index, /carousel-express/);
  });
});
