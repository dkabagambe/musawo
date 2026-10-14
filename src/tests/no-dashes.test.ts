/**
 * Checks that no em dash (U+2014) or en dash (U+2013) appears
 * in any source file under src/, prisma/, or docs/.
 *
 * Only comments and test files are exempted from this rule.
 * User-visible text (JSX, strings, template literals) must use
 * a hyphen, comma, or full stop instead.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const EM_DASH = "\u2014";
const EN_DASH = "\u2013";

const SKIP_DIRS  = new Set(["node_modules", ".next", ".git", "dist", "build"]);
const SKIP_EXTS  = new Set([".ico", ".png", ".webp", ".jpg", ".woff", ".woff2", ".ico"]);

/**
 * Returns lines that contain an em/en dash, with file and line number.
 * Strips comment-only lines (starting with // or * after trim).
 * Excludes test files (*.test.ts, *.spec.ts).
 */
function collectViolations(dir: string): string[] {
  const violations: string[] = [];

  function walk(current: string) {
    let entries: string[];
    try { entries = readdirSync(current); } catch { return; }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(current, entry);
      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      const ext = entry.slice(entry.lastIndexOf("."));
      if (SKIP_EXTS.has(ext)) continue;

      // Skip test files - comments there are acceptable
      if (entry.endsWith(".test.ts") || entry.endsWith(".spec.ts")) continue;

      let content: string;
      try { content = readFileSync(full, "utf-8"); } catch { continue; }

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes(EM_DASH) && !line.includes(EN_DASH)) continue;

        // Skip comment-only lines and lines where em dash only appears in an inline comment
        const trimmed = line.trim();
        if (
          trimmed.startsWith("//") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("#")
        ) continue;

        // If the em/en dash only appears in the portion after a // comment marker, skip
        const commentIdx = line.indexOf("//");
        const lineBeforeComment = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
        if (!lineBeforeComment.includes(EM_DASH) && !lineBeforeComment.includes(EN_DASH)) continue;

        violations.push(`${full}:${i + 1}: ${line.trimEnd()}`);
      }
    }
  }

  walk(dir);
  return violations;
}

const ROOT = process.cwd();

describe("No em dashes or en dashes in user-visible text", () => {
  it("src/ contains no em or en dashes outside comments", () => {
    const violations = collectViolations(join(ROOT, "src"));
    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  it("prisma/ contains no em or en dashes", () => {
    const violations = collectViolations(join(ROOT, "prisma"));
    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  it("docs/ contains no em or en dashes", () => {
    const violations = collectViolations(join(ROOT, "docs"));
    expect(violations, violations.join("\n")).toHaveLength(0);
  });
});
