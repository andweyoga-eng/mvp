/**
 * Duplicate session form defaults: keep all copied fields (including recurrence),
 * clear date/time, and publish immediately.
 */
export function withDuplicateSessionDefaults<
  T extends { date: string; publishMode: "now" | "later"; publishAt: string },
>(form: T): T {
  return {
    ...form,
    date: "",
    publishMode: "now",
    publishAt: "",
  };
}
