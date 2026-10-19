/** Seeded-violation helpers: each seed edits one file of a copy of the real src/v2 tree. */
import { loadTree, type Tree } from "../../scripts/v2/css/tree";

export const realTree: Tree = loadTree();

export type Seed = { name: string; path: string; edit: (text: string) => string };

export const apply = (seed: Seed): Tree => {
  const tree = new Map(realTree);
  tree.set(seed.path, seed.edit(tree.get(seed.path) ?? ""));
  return tree;
};

export const TICK_CSS = "design/primitives/TickToggle/TickToggle.module.css";
export const TICK_TSX = "design/primitives/TickToggle/TickToggle.tsx";
export const STACK_TSX = "design/primitives/Stack/Stack.tsx";
export const SEMANTIC = "design/tokens/semantic.css";
export const MOTION = "design/tokens/motion-etc.css";
export const BASE = "design/base/base.css";
export const SHELL_TSX = "app/shell/AppShell.tsx";

/** Insert a declaration into the first `.root {` block of a module. */
export const addDecl =
  (decl: string) =>
  (css: string): string =>
    css.replace(/\.root \{/, `.root {\n    ${decl}`);
/** Append CSS inside the module's @layer block. */
export const appendInLayer =
  (rule: string) =>
  (css: string): string =>
    css.replace(/\}\s*$/, `\n  ${rule}\n}\n`);

/** Run a check over each seed; returns the names of seeds that stayed green (should be []). */
export const greenSeeds = (seeds: Seed[], check: (tree: Tree) => string[], tag: string): string[] =>
  seeds.filter((s) => !check(apply(s)).some((v) => v.startsWith(tag))).map((s) => s.name);
