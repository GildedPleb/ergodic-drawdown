/** A v2 source tree as a path → text map, so every CSS rule can run on the real tree or a seeded copy. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const REPO = join(import.meta.dir, "../../..");
export const V2 = join(REPO, "src/v2");

/** Paths are relative to src/v2, with forward slashes. */
export type Tree = Map<string, string>;

export const loadTree = (root: string = V2): Tree => {
  const tree: Tree = new Map();
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir).toSorted()) {
      const abs = join(dir, name);
      const r = rel === "" ? name : `${rel}/${name}`;
      if (statSync(abs).isDirectory()) walk(abs, r);
      else if (/\.(css|tsx?)$/.test(name)) tree.set(r, readFileSync(abs, "utf8"));
    }
  };
  walk(root, "");
  return tree;
};

export const cssFiles = (tree: Tree): string[] =>
  [...tree.keys()].filter((p) => p.endsWith(".css"));
export const moduleFiles = (tree: Tree): string[] =>
  [...tree.keys()].filter((p) => p.endsWith(".module.css"));
export const sourceFiles = (tree: Tree): string[] =>
  [...tree.keys()].filter((p) => /\.tsx?$/.test(p) && !p.endsWith(".d.ts"));

export const dirOf = (path: string): string => path.slice(0, Math.max(0, path.lastIndexOf("/")));
/** design/primitives/X/X.module.css → design/primitives/X/X.tsx */
export const ownerOf = (modulePath: string): string => modulePath.replace(/\.module\.css$/, ".tsx");
/** design/primitives/X/X.tsx → design/primitives/X/X.module.css */
export const moduleOf = (tsxPath: string): string => tsxPath.replace(/\.tsx$/, ".module.css");
