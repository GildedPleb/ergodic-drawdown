/**
 * stylelint core rules (ADR-002 R3, R4 values, R6, R8, R9 properties) as a gate: the real src/v2 tree
 * must be clean, a compliant guarded animation must pass, and every seeded violation must fail.
 * Runs in `bun run lint` (CI check job + pre-commit). It is kept out of the ~1 s suite because
 * stylelint's start-up alone is ~150 ms (ADR "what would change our mind": move the slowest check to check).
 */
import { checkVars } from "./rules";
import { runStylelint } from "./stylelint";
import { loadTree, type Tree } from "./tree";

const TICK = "design/primitives/TickToggle/TickToggle.module.css";
const BASE = "design/base/base.css";

type Seed = { name: string; path: string; edit: (css: string) => string };
const addDecl =
  (decl: string) =>
  (css: string): string =>
    css.replace(/\.root \{/, `.root {\n    ${decl}`);
const append =
  (rule: string) =>
  (css: string): string =>
    css.replace(/\}\s*$/, `\n  ${rule}\n}\n`);

export const SEEDS: Seed[] = [
  // R3
  { name: "R3 !important", path: TICK, edit: addDecl("color: var(--text) !important;") },
  { name: "R3 id selector", path: TICK, edit: append("#x { color: var(--text); }") },
  {
    name: "R3 :global outside base",
    path: TICK,
    edit: append(":global(.x) { color: var(--text); }"),
  },
  {
    name: "R3 element selector in a module",
    path: TICK,
    edit: append(".root span { color: var(--text); }"),
  },
  {
    name: "R3 three compound selectors",
    path: TICK,
    edit: append(".root .box .check { color: var(--text); }"),
  },
  // R4
  { name: "R4 raw 12px padding", path: TICK, edit: addDecl("padding-block: 12px;") },
  {
    name: "R4 calc(12px + token)",
    path: TICK,
    edit: addDecl("padding-block: calc(12px + var(--s-1));"),
  },
  { name: "R4 var() fallback", path: TICK, edit: addDecl("padding-block: var(--s-1, 4px);") },
  { name: "R4 2px outline", path: TICK, edit: addDecl("outline: 2px solid var(--focus);") },
  {
    name: "R4 box-shadow",
    path: TICK,
    edit: addDecl("box-shadow: inset 0 0 0 var(--rule-hair) var(--rule);"),
  },
  { name: "R4 text-shadow", path: TICK, edit: addDecl("text-shadow: none;") },
  { name: "R4 raw font-family", path: TICK, edit: addDecl('font-family: "Jost", sans-serif;') },
  { name: "R4 raw z-index", path: TICK, edit: addDecl("z-index: 10;") },
  { name: "R4 raw colour", path: TICK, edit: addDecl("color: #fff;") },
  { name: "R4 rounded corner", path: TICK, edit: addDecl("border-radius: 4px;") },
  { name: "R4 raw duration", path: TICK, edit: addDecl("transition-duration: 200ms;") },
  // R6
  { name: "R6 margin", path: TICK, edit: addDecl("margin: 0;") },
  { name: "R6 margin-block", path: TICK, edit: addDecl("margin-block: var(--s-1);") },
  // R8
  { name: "R8 width", path: TICK, edit: addDecl("width: 100%;") },
  { name: "R8 left", path: TICK, edit: addDecl("left: 0;") },
  { name: "R8 border-left", path: TICK, edit: addDecl("border-left: 0;") },
  { name: "R8 padding-top", path: TICK, edit: addDecl("padding-top: 0;") },
  {
    name: "R8 viewport media in a primitive",
    path: TICK,
    edit: append("@media (min-width: 40em) { .root { gap: 0; } }"),
  },
  // R9
  {
    name: "R9 transition on width",
    path: TICK,
    edit: addDecl("transition: width var(--dur-fast);"),
  },
  { name: "R9 transition-property: all", path: TICK, edit: addDecl("transition-property: all;") },
  // base may zero margins but keeps the shadow and physical-property bans
  {
    name: "R4 box-shadow in base",
    path: BASE,
    edit: (c) => c.replace("color-scheme: dark;", "color-scheme: dark;\n    box-shadow: none;"),
  },
];

/**
 * stylelint and R4 (checkVars) agree on local variables: a `--_x` declared and used in one file
 * passes both; an undeclared one, or one declared only in another file, fails both.
 */
export const AGREE: { seed: Seed; ok: boolean }[] = [
  {
    ok: true,
    seed: {
      name: "own local --_x",
      path: TICK,
      edit: addDecl("--_x: var(--s-2);\n    padding-block: var(--_x);"),
    },
  },
  {
    ok: false,
    seed: { name: "undeclared local --_y", path: TICK, edit: addDecl("padding-block: var(--_y);") },
  },
  {
    ok: false,
    seed: {
      name: "foreign local --_x (declared in another file)",
      path: TICK,
      edit: addDecl("padding-block: var(--_chips-max);"), // Swatches' own
    },
  },
];

/** Allowed forms that must not be flagged. */
const COMPLIANT: Seed = {
  name: "guarded transform/opacity animation, currentColor, unitless 0, @keyframes to",
  path: TICK,
  edit: (c) =>
    append(
      [
        "@media (prefers-reduced-motion: no-preference) { .check { transition: opacity var(--dur-fast) var(--ease-out); } }",
        "@keyframes tick-in { from { opacity: 0; } to { opacity: 1; transform: scaleY(1); } }",
        "@media (forced-colors: active) { .box { border-color: currentColor; } }",
      ].join("\n  "),
    )(addDecl("fill: currentColor;\n    padding-block: 0;")(c)),
};

const seeded = (tree: Tree, seed: Seed): Tree => {
  const copy = new Map(tree);
  copy.set(seed.path, seed.edit(copy.get(seed.path) ?? ""));
  return copy;
};

if (import.meta.main) {
  const tree = loadTree();
  const problems: string[] = [...(await runStylelint(tree))];
  problems.push(
    ...(await runStylelint(seeded(tree, COMPLIANT), [COMPLIANT.path])).map(
      (v) => `false positive: ${v}`,
    ),
  );
  for (const seed of SEEDS) {
    const copy = seeded(tree, seed);
    if (copy.get(seed.path) === tree.get(seed.path))
      problems.push(`seed did not apply: ${seed.name}`);
    else if ((await runStylelint(copy, [seed.path])).length === 0)
      problems.push(`seed stayed green: ${seed.name}`);
  }
  for (const { seed, ok } of AGREE) {
    const copy = seeded(tree, seed);
    const lint = (await runStylelint(copy, [seed.path])).length === 0;
    const r4 = !checkVars(copy).some((v) => v.startsWith(`R4 ${seed.path}`));
    if (lint !== ok || r4 !== ok)
      problems.push(
        `stylelint/R4 disagree on "${seed.name}": stylelint ${lint}, R4 ${r4}, want ${ok}`,
      );
  }
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(
    `stylelint gate ok: tree clean, ${SEEDS.length} seeded violations red, ${AGREE.length} local-var cases agree with R4`,
  );
}
