/** Pre/post session emotional states — used in UI and future instructor aggregates */
export const MOOD_OPTIONS = [
  { id: "calm", label: "Calm & centered", emoji: "🧘" },
  { id: "neutral", label: "Steady & neutral", emoji: "😌" },
  { id: "off_balance", label: "Still settling", emoji: "🌊" },
  { id: "energized", label: "Light & energized", emoji: "✨" },
  { id: "turbo", label: "Turbo-charged", emoji: "⚡" },
  { id: "ecstatic", label: "Ecstatic & open", emoji: "🌟" },
] as const;

export type MoodId = (typeof MOOD_OPTIONS)[number]["id"];

export const PRE_SESSION_MOOD_PROMPT =
  "How are you arriving today? A quick check-in helps your instructor tailor the session.";

export const POST_SESSION_MOOD_PROMPT =
  "How do you feel after practice? Your reflection helps us personalize future sessions.";

export const POST_SESSION_SKIP_NOTE =
  "Tracking how you feel after class helps us tailor pace, tone, and focus for you. You can skip anytime. It only takes a few seconds when you're ready.";
