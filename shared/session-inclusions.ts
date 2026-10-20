/** One checkout line. Blank lines and duplicate wording are dropped. */
const ITEM_PREFIX = /^[-*•]\s+/;

export function parseSessionCoverageItems(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.replace(ITEM_PREFIX, "").trim();
    if (!line) continue;
    const key = line.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(line);
  }
  return items;
}

/** Store a stable newline list, or null when the admin left the section empty. */
export function normalizeSessionCoverageText(value: string | null | undefined): string | null {
  const items = parseSessionCoverageItems(value);
  return items.length > 0 ? items.join("\n") : null;
}
