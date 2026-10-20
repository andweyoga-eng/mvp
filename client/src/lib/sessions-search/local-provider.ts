import { SESSIONS_HELP_INDEX } from "./help-index";
import { SITE_CONTENT_INDEX } from "./site-content-index";
import { queryIntent, scoreSearchMatch } from "./match";
import type {
  SessionsSearchCatalog,
  SessionsSearchProvider,
  SessionsSearchResult,
} from "./types";

const MAX_RESULTS = 16;

function pushRanked(
  bucket: SessionsSearchResult[],
  seen: Set<string>,
  result: SessionsSearchResult,
): void {
  if (seen.has(result.id)) return;
  seen.add(result.id);
  bucket.push(result);
}

export const localSessionsSearchProvider: SessionsSearchProvider = {
  search(query, catalog) {
    const q = query.trim();
    if (!q) return [];

    const intent = queryIntent(q);
    const results: SessionsSearchResult[] = [];
    const seen = new Set<string>();

    for (const s of catalog.bookedSessions) {
      const score = scoreSearchMatch(q, {
        title: s.className,
        body: [s.instructorName, s.status, "booked", "my booking"].join(" "),
        keywords: ["booking", "my session"],
      });
      if (!score) continue;
      pushRanked(results, seen, {
        id: `booked-${s.bookingId}`,
        kind: "booked_session",
        title: s.className,
        subtitle: s.instructorName,
        meta: "Your booking",
        href: "/my-account#sessions",
        score: score + (intent.wantsMyMentors ? 0 : 5),
      });
    }

    for (const s of catalog.todaySessions) {
      const score = scoreSearchMatch(q, {
        title: s.className,
        body: [s.classDescription, s.instructorName, "available today"].filter(Boolean).join(" "),
      });
      if (!score) continue;
      pushRanked(results, seen, {
        id: `today-${s.id}`,
        kind: "available_today",
        title: s.className,
        subtitle: s.instructorName,
        meta: s.soldOut ? "Available today · Full" : "Available today",
        score,
      });
    }

    for (const s of catalog.scheduleSessions) {
      const score = scoreSearchMatch(q, {
        title: s.className,
        body: [s.classDescription, s.instructorName, "upcoming session", "schedule"].join(" "),
      });
      if (!score) continue;
      pushRanked(results, seen, {
        id: `schedule-${s.id}`,
        kind: "available_session",
        title: s.className,
        subtitle: s.instructorName,
        meta: s.soldOut ? "Upcoming · Full" : "Upcoming session",
        score,
      });
    }

    for (const ct of catalog.classTypes) {
      const score = scoreSearchMatch(q, {
        title: ct.name,
        body: [ct.description, ct.intensity, ct.strictNoTo, "class type", "workout"]
          .filter(Boolean)
          .join(" "),
        keywords: ["class", "book", "reserve"],
      });
      if (!score) continue;
      pushRanked(results, seen, {
        id: `class-${ct.id}`,
        kind: "class_type",
        title: ct.name,
        subtitle: ct.description?.slice(0, 120) || (ct.duration ? `${ct.duration} min` : undefined),
        meta: "Class type",
        score,
      });
    }

    for (const m of catalog.mentors) {
      const score = scoreSearchMatch(q, {
        title: m.name,
        body: [m.specialty, m.bio, "my mentor", "my coach", "booking history"].filter(Boolean).join(" "),
        keywords: ["mentor", "coach", "instructor", "my coaches", "my mentors"],
      });
      if (!score && !intent.wantsMyMentors) continue;
      const base = score || (intent.wantsMyMentors ? 70 : 0);
      if (!base) continue;
      pushRanked(results, seen, {
        id: `my-mentor-${m.name}`,
        kind: "my_mentor",
        title: m.name,
        subtitle: m.specialty,
        meta: "Your mentor from bookings",
        href: "/dashboard#your-mentors",
        score: base + (intent.wantsMyMentors ? 40 : 0),
      });
    }

    for (const c of catalog.publicCoaches) {
      const score = scoreSearchMatch(q, {
        title: c.name,
        body: [c.bio, c.specialties?.join(" "), "coach", "instructor", "teacher"].filter(Boolean).join(" "),
        keywords: ["coach", "instructor"],
      });
      if (!score && !intent.wantsCoaches) continue;
      const base = score || (intent.wantsCoaches ? 55 : 0);
      if (!base) continue;
      pushRanked(results, seen, {
        id: `coach-${c.id}`,
        kind: "coach",
        title: c.name,
        subtitle: c.specialties?.[0] ?? c.bio?.slice(0, 100) ?? undefined,
        meta: "Coach profile",
        href: "/#ally",
        score: base + (intent.wantsCoaches ? 25 : 0),
      });
    }

    for (const entry of SITE_CONTENT_INDEX) {
      const score = scoreSearchMatch(q, {
        title: entry.title,
        body: entry.body,
        keywords: [...entry.keywords, entry.section],
      });
      if (!score) continue;
      let boost = 0;
      if (intent.wantsCoaches && entry.section.toLowerCase().includes("coach")) boost += 30;
      pushRanked(results, seen, {
        id: entry.id,
        kind: "site_content",
        title: entry.title,
        subtitle: entry.body.slice(0, 140),
        meta: entry.section,
        href: entry.href,
        score: score + boost,
      });
    }

    for (const h of SESSIONS_HELP_INDEX) {
      const score = scoreSearchMatch(q, {
        title: h.title,
        body: h.summary,
        keywords: h.keywords,
      });
      if (!score) continue;
      pushRanked(results, seen, {
        id: h.id,
        kind: "help",
        title: h.title,
        subtitle: h.summary,
        meta: "Help",
        href: h.href,
        score,
      });
    }

    return results
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, MAX_RESULTS)
      .map(({ score: _score, ...rest }) => rest);
  },
};
