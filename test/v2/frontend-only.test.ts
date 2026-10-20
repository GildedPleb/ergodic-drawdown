/**
 * MVP-SPEC G13 (hard gate, Probe m1): v2 is frontend only. Against $BASE (the last upstream commit
 * merged into `redesign`: the merge-base with main, or G13_BASE), nothing under src/ outside
 * src/v2/ may differ, in commits or in the working tree. That covers the spec's list (src/engine,
 * src/contexts, src/classes, src/data, src/halvings.ts, src/api.ts, src/number-at.ts,
 * src/constants.ts, src/types.ts) and the old UI (src/components, src/panels, src/app.tsx,
 * src/main.tsx, src/content.ts, …).
 *
 * No tolerance of any kind (Keel's ruling, Rule 0): "Back-end files are byte-identical to main; no
 * edits of any kind, including export/visibility; v2 mirrors via G12 source tests."
 */
import { spawnSync } from "node:child_process";

import { expect, test } from "bun:test";

declare const process: { env: Record<string, string | undefined> };

const root = `${import.meta.dir}/../..`;

const git = (...args: string[]): string | undefined => {
  const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return run.status === 0 ? run.stdout.trim() : undefined;
};

/** Changed paths a frontend-only change may not touch: anything under src/ outside src/v2/. */
const g13Violations = (changed: readonly string[]): string[] =>
  changed.filter((p) => p.startsWith("src/") && !p.startsWith("src/v2/"));

/**
 * Front-end shell files outside src/v2 (Keel, §1L). public/: only the favicon rasters, matched by
 * exact path (Form's fan-diamond replaces the SM monogram at the same paths); every other public/
 * file (manifest icons, apple-touch-icon, image.png, site.webmanifest) stays byte-identical.
 */
const SHELL_ASSETS: readonly string[] = [
  "public/favicon.ico",
  "public/favicon-16x16.png",
  "public/favicon-32x32.png",
];
const publicViolations = (changed: readonly string[]): string[] =>
  changed.filter((p) => p.startsWith("public/") && !SHELL_ASSETS.includes(p));

const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
const VIEWPORT_FIT =
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />';
const PRELOADS = `    <link
      rel="preload"
      href="/src/v2/design/fonts/SMCormorant-500.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <link
      rel="preload"
      href="/src/v2/design/fonts/SMJost-500.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
  </head>`;

/**
 * index.html is a front-end shell file. Its only allowed difference from main is Keel's §1L ruling,
 * the viewport meta gaining `viewport-fit=cover` (so env(safe-area-inset-*) is non-zero on notched
 * phones), on top of the branch's v2 entry and font preloads (AGENTS.md "Entry on this branch").
 * Anything else, a favicon link included, fails: it needs a Keel ruling first.
 */
const allowedIndex = (main: string): string =>
  main
    .replace(VIEWPORT, VIEWPORT_FIT)
    .replace("  </head>", PRELOADS)
    .replace('src="/src/main.tsx"', 'src="/src/v2/app/main.tsx"');

const resolveBase = (): string | undefined => {
  const pinned = process.env["G13_BASE"];
  if (pinned !== undefined && pinned !== "") return pinned;
  for (const ref of ["origin/main", "main"]) {
    const base = git("merge-base", "HEAD", ref);
    if (base !== undefined && base !== "") return base;
  }
  return undefined;
};

const base = resolveBase();

// A shallow CI checkout has no main to diff against; the local hook (full clone) enforces it.
const shallowCi = base === undefined && process.env["CI"] !== undefined;

test(
  shallowCi
    ? "G13: not checked here (shallow CI clone without main; the commit hook enforces it)"
    : "G13: no engine, model, walk, settings or old-UI file differs from $BASE",
  () => {
    if (shallowCi) return;
    expect({ base: base ?? "unresolved (fetch main or set G13_BASE)" }).toEqual({
      base: base ?? "",
    });
    const changed = (git("diff", "--name-only", base ?? "HEAD", "--", "src") ?? "")
      .split("\n")
      .filter(Boolean);
    expect(g13Violations(changed)).toEqual([]);
  },
);

test(
  shallowCi
    ? "G13 shell: not checked here (shallow CI clone without main)"
    : "G13 shell: index.html differs from $BASE only by viewport-fit=cover; public/ only the favicons",
  () => {
    if (shallowCi) return;
    const main = git("show", `${base ?? "HEAD"}:index.html`) ?? "";
    const head = (
      spawnSync("cat", ["index.html"], { cwd: root, encoding: "utf8" }).stdout ?? ""
    ).trimEnd();
    expect(head).toBe(allowedIndex(main));
    const changed = (git("diff", "--name-only", base ?? "HEAD", "--", "public") ?? "")
      .split("\n")
      .filter(Boolean);
    expect(publicViolations(changed)).toEqual([]);
  },
);

test("G13 shell seeded: any index.html edit beyond viewport-fit is red; other public/ files are red", () => {
  const main = `<html>\n  <head>\n    ${VIEWPORT}\n    <link rel="icon" href="/favicon-32x32.png" />\n  </head>\n  <body><script type="module" src="/src/main.tsx"></script></body>\n</html>`;
  const ok = allowedIndex(main);
  expect(ok.includes("viewport-fit=cover")).toBe(true);
  // Without the viewport change, or with any other edit (a favicon link here), it no longer matches.
  expect(ok.replace(VIEWPORT_FIT, VIEWPORT) === allowedIndex(main)).toBe(false);
  expect(ok.replace("/favicon-32x32.png", "/v2/favicon.svg") === allowedIndex(main)).toBe(false);
  expect(`${ok}<!-- extra -->` === allowedIndex(main)).toBe(false);
  expect(publicViolations([...SHELL_ASSETS])).toEqual([]);
  for (const p of [
    "public/apple-touch-icon.png",
    "public/android-chrome-192x192.png",
    "public/site.webmanifest",
    "public/image.png",
    "public/favicon.svg",
  ]) {
    expect(publicViolations([p])).toEqual([p]);
  }
});

test("G13 seeded: an engine, model, walk, settings or old-UI change is red; v2 and tests are green", () => {
  for (const p of [
    "src/engine/engine.ts",
    "src/data/models/historic.ts",
    "src/data/walks/bubble.ts",
    "src/contexts/model.tsx",
    "src/constants.ts",
    "src/components/input/volatility.tsx",
    "src/panels/model.tsx",
    "src/main.tsx",
  ]) {
    expect(g13Violations([p])).toEqual([p]);
  }
  expect(
    g13Violations(["src/v2/app/models/ModelsPane.tsx", "test/v2/x.test.ts", "test-suite.json"]),
  ).toEqual([]);
});

test("G13 seeded: an export-only edit to a back-end file is red (no visibility changes either)", () => {
  // `git diff --name-only` lists a file whose only change is `const` → `export const`.
  const exportOnly = "src/contexts/computed/distribution.ts";
  expect(g13Violations([exportOnly])).toEqual([exportOnly]);
});
