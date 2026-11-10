/** Token/synonym matching for Sessions search (v1 local index). */

const SYNONYMS: Record<string, string[]> = {
  coach: ["instructor", "mentor", "teacher", "trainer", "guides"],
  mentor: ["coach", "instructor", "teacher"],
  seniors: ["senior", "elderly", "older", "aging", "60+", "shasti"],
  flexibility: ["flexible", "mobility", "stretch", "range"],
  strength: ["strong", "power", "resistance", "muscle"],
  sound: ["sound therapy", "healing", "vibration", "gong", "bowl"],
  therapy: ["therapeutic", "healing", "restorative"],
  meditation: ["mindfulness", "stillness", "breath", "pranayama"],
  yoga: ["asana", "practice", "mat", "flow", "hatha", "vinyasa"],
  booking: ["booked", "reservation", "my session", "my sessions"],
  refund: ["payment", "receipt", "invoice"],
};

const INTENT_PHRASES = {
  myMentors: [
    "my coach",
    "my coaches",
    "my mentor",
    "my mentors",
    "all my coaches",
    "all my mentors",
    "coaches from my bookings",
    "mentors from my bookings",
  ],
  coaches: ["coach", "coaches", "instructor", "instructors", "meet coach", "our coaches"],
} as const;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[+]/g, " plus ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(query: string): string[] {
  return normalizeText(query)
    .split(" ")
    .filter((t) => t.length > 1);
}

export function expandTokens(tokens: string[]): Set<string> {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (token === key || syns.includes(token)) {
        expanded.add(key);
        for (const s of syns) expanded.add(s);
      }
    }
  }
  return expanded;
}

export function queryIntent(query: string): {
  wantsMyMentors: boolean;
  wantsCoaches: boolean;
} {
  const q = normalizeText(query);
  const wantsMyMentors = INTENT_PHRASES.myMentors.some((p) => q.includes(p));
  const wantsCoaches =
    !wantsMyMentors &&
    (INTENT_PHRASES.coaches.some((p) => q === p || q.includes(p)) || /\bcoach(es)?\b/.test(q));
  return { wantsMyMentors, wantsCoaches };
}

/**
 * Score how well query matches searchable fields. 0 = no match.
 * Higher is better; title hits weigh more than body.
 */
export function scoreSearchMatch(query: string, fields: {
  title?: string;
  body?: string;
  keywords?: string[];
}): number {
  const q = normalizeText(query);
  if (!q) return 0;

  const title = normalizeText(fields.title ?? "");
  const body = normalizeText([fields.body, ...(fields.keywords ?? [])].filter(Boolean).join(" "));
  const haystack = `${title} ${body}`.trim();
  if (!haystack) return 0;

  const tokens = tokenize(q);
  const expanded = expandTokens(tokens);

  if (title === q || title.includes(q)) return 120;
  if (haystack.includes(q)) return 100;

  const expandedArr = [...expanded];
  const allTokensInHaystack = expandedArr.every((t) => haystack.includes(t));
  if (allTokensInHaystack && expandedArr.length >= 2) return 85;

  let score = 0;
  for (const token of expandedArr) {
    if (title.includes(token)) score += 18;
    else if (body.includes(token)) score += 10;
  }

  const matchedRatio = expandedArr.filter((t) => haystack.includes(t)).length / expandedArr.length;
  if (matchedRatio >= 0.6) score += Math.round(matchedRatio * 25);

  return score >= 12 ? score : 0;
}
