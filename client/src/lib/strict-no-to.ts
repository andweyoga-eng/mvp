import { STRICT_NO_TO_MAX_LENGTH } from "@shared/schema";

export { STRICT_NO_TO_MAX_LENGTH };

export function parseStrictNoToTags(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Collapsed-row hint for contraindication lists. */
export function formatStrictNoToSummary(tagCount: number): string {
  if (tagCount === 0) return "None";
  if (tagCount === 1) return "1 listed";
  return `${tagCount} listed`;
}

export function strictNoToCounterState(length: number): {
  isOverLimit: boolean;
  isNearLimit: boolean;
  counterColor: string;
} {
  return {
    isOverLimit: length > STRICT_NO_TO_MAX_LENGTH,
    isNearLimit: length >= 90 && length <= STRICT_NO_TO_MAX_LENGTH,
    counterColor:
      length > STRICT_NO_TO_MAX_LENGTH
        ? "#ba1a1a"
        : length >= 90
          ? "#b45309"
          : "var(--awy-on-surface-variant, #494550)",
  };
}
