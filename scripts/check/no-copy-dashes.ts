import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * DESIGN DECISION (hard-coded): user-facing copy must never contain em dashes
 * (U+2014) or en dashes (U+2013). Use a period, comma, hyphen for ranges, or the
 * word "to" instead. This guard fails `npm run check` (and therefore `npm test`)
 * if a dash reaches any string literal, template literal, or JSX text node.
 *
 * Code comments are intentionally exempt: they never render to a user. Detection
 * uses the TypeScript AST so comments are skipped and apostrophes inside JSX text
 * are never mistaken for string delimiters.
 */

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH_RE = new RegExp(`[${EM_DASH}${EN_DASH}]`);

const ROOT = process.cwd();
const SCAN_DIRS = ["client/src", "server", "shared"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git"]);
const SELF = "scripts/check/no-copy-dashes.ts";

function isSourceFile(path: string): boolean {
  if (!/\.(ts|tsx)$/.test(path)) return false;
  if (/\.test\.tsx?$/.test(path)) return false;
  if (path.endsWith("storage-old.ts")) return false;
  return true;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (isSourceFile(full)) out.push(full);
  }
}

interface Violation {
  file: string;
  line: number;
  char: string;
  snippet: string;
}

/** True for the node kinds that carry rendered copy (not comments, not identifiers). */
function isCopyNode(node: ts.Node): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isJsxText(node)
  );
}

function scan(file: string, text: string): Violation[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations: Violation[] = [];

  const visit = (node: ts.Node): void => {
    if (isCopyNode(node)) {
      const raw = node.getText(source);
      let idx = raw.search(DASH_RE);
      while (idx !== -1) {
        const pos = node.getStart(source) + idx;
        const { line } = source.getLineAndCharacterOfPosition(pos);
        const lineText = text.split("\n")[line] ?? "";
        violations.push({
          file,
          line: line + 1,
          char: raw[idx],
          snippet: lineText.trim(),
        });
        const nextRel = raw.slice(idx + 1).search(DASH_RE);
        idx = nextRel === -1 ? -1 : idx + 1 + nextRel;
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return violations;
}

const files: string[] = [];
for (const dir of SCAN_DIRS) {
  try {
    walk(join(ROOT, dir), files);
  } catch {
    // directory may not exist in every checkout; skip silently
  }
}

const all: Violation[] = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  if (rel === SELF) continue;
  all.push(...scan(rel, readFileSync(file, "utf8")));
}

if (all.length > 0) {
  console.error(
    `\n[no-copy-dashes] Found ${all.length} em/en dash(es) in copy. ` +
      `Use a period, comma, hyphen for ranges, or the word "to" instead.\n`,
  );
  for (const v of all) {
    const name = v.char === EM_DASH ? "em dash" : "en dash";
    console.error(`  ${v.file}:${v.line}  (${name})  ${v.snippet}`);
  }
  console.error("");
  process.exit(1);
}

console.log("[no-copy-dashes] OK: no em/en dashes in copy.");
