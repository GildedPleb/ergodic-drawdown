/**
 * MVP-SPEC G13 (hard gate, Probe m1): v2 is frontend only. Against $BASE (the last upstream commit
 * merged into `redesign`: the merge-base with main, or G13_BASE), nothing under src/ outside
 * src/v2/ may differ, in commits or in the working tree. That covers the spec's list (src/engine,
 * src/contexts, src/classes, src/data, src/halvings.ts, src/api.ts, src/number-at.ts,
 * src/constants.ts, src/types.ts) and the old UI (src/components, src/panels, src/app.tsx,
 * src/main.tsx, src/content.ts, …).
 */
import { spawnSync } from "node:child_process";

import { expect, test } from "bun:test";

declare const process: { env: Record<string, string | undefined> };

const root = `${import.meta.dir}/../..`;

const git = (...args: string[]): string | undefined => {
  const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return run.status === 0 ? run.stdout.trim() : undefined;
};

/** Paths a frontend-only change may not touch. */
const g13Violations = (changed: readonly string[]): string[] =>
  changed.filter((p) => p.startsWith("src/") && !p.startsWith("src/v2/"));

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
    expect(changed.every((p) => p.startsWith("src/v2/"))).toBe(true);
    expect(g13Violations(changed)).toEqual([]);
  },
);

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
