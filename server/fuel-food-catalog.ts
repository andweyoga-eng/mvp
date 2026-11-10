/**
 * WeFuel food-name catalog for autocomplete (after personal history).
 * Seed: data/nutrition/fuel-food-catalog-v1.json from ICMR-NIN / curated workbook.
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export type FuelFoodCatalogHit = {
  name: string;
  source: "catalog";
  kind: "ingredient" | "dish" | string;
};

type CatalogEntry = {
  name: string;
  aliases: string[];
  kind: string;
  group?: string;
  code?: string;
  source?: string;
};

type CatalogFile = {
  version: number;
  entries: CatalogEntry[];
};

type IndexRow = {
  display: string;
  needle: string;
  kind: string;
};

let index: IndexRow[] | null = null;

function catalogPath(): string {
  const candidates = [
    join(process.cwd(), "data/nutrition/fuel-food-catalog-v1.json"),
    join(dirname(fileURLToPath(import.meta.url)), "../data/nutrition/fuel-food-catalog-v1.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("fuel-food-catalog-v1.json not found (expected under data/nutrition/)");
}

function loadIndex(): IndexRow[] {
  if (index) return index;
  const raw = readFileSync(catalogPath(), "utf8");
  const data = JSON.parse(raw) as CatalogFile;
  const rows: IndexRow[] = [];
  const seenNeedle = new Set<string>();
  for (const e of data.entries ?? []) {
    const display = e.name?.trim();
    if (!display) continue;
    const needles = [display, ...(e.aliases ?? [])];
    for (const n of needles) {
      const needle = n.trim().toLowerCase();
      if (!needle || seenNeedle.has(`${display.toLowerCase()}::${needle}`)) continue;
      seenNeedle.add(`${display.toLowerCase()}::${needle}`);
      rows.push({ display, needle, kind: e.kind || "ingredient" });
    }
  }
  index = rows;
  return rows;
}

/** Prefix / exact / display matches rank above loose alias substrings. */
export function searchFuelFoodCatalog(query: string, limit = 8): FuelFoodCatalogHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const rows = loadIndex();

  type Scored = { display: string; kind: string; score: number };
  const best = new Map<string, Scored>();

  for (const row of rows) {
    const displayKey = row.display.toLowerCase();
    const isDisplayNeedle = row.needle === displayKey;
    let score = -1;
    if (isDisplayNeedle && displayKey.startsWith(q)) score = 100;
    else if (isDisplayNeedle && displayKey.includes(q)) score = 80;
    else if (row.needle === q) score = 90;
    else if (row.needle.startsWith(q)) score = 60;
    else if (row.needle.includes(q)) score = 40;
    if (score < 0) continue;

    const prev = best.get(displayKey);
    if (!prev || score > prev.score) {
      best.set(displayKey, { display: row.display, kind: row.kind, score });
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.display.localeCompare(b.display))
    .slice(0, limit)
    .map((h) => ({ name: h.display, source: "catalog" as const, kind: h.kind }));
}
