/** Small typed helpers over oxc-parser's ESTree output and PostCSS. */
import { parseSync } from "oxc-parser";
import postcss, { AtRule, type ChildNode, type Root, Rule } from "postcss";

export type Node = { type: string; [key: string]: unknown };

export const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

export const child = (n: Node | undefined, key: string): Node | undefined => {
  const v = n?.[key];
  return isNode(v) ? v : undefined;
};

export const kids = (n: Node | undefined, key: string): Node[] => {
  const v = n?.[key];
  return Array.isArray(v) ? v.filter(isNode) : [];
};

export const text = (n: Node | undefined, key: string): string | undefined => {
  const v = n?.[key];
  return typeof v === "string" ? v : undefined;
};

/** TemplateElement.value.cooked */
export const cooked = (n: Node | undefined): string | undefined => {
  const v = n?.["value"];
  if (typeof v !== "object" || v === null || !("cooked" in v)) return undefined;
  return typeof v.cooked === "string" ? v.cooked : undefined;
};

const programCache = new Map<string, { code: string; program: Node }>();
export const parseTs = (path: string, code: string): Node => {
  const hit = programCache.get(path);
  if (hit?.code === code) return hit.program;
  const program: unknown = parseSync(path, code, {
    lang: path.endsWith(".tsx") ? "tsx" : "ts",
  }).program;
  if (!isNode(program)) throw new Error(`oxc returned no program for ${path}`);
  programCache.set(path, { code, program });
  return program;
};

/** Depth-first walk over every AST node. */
export const walk = (node: Node, visit: (node: Node) => void): void => {
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, visit);
    } else if (isNode(value)) walk(value, visit);
  }
};

const WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "ParenthesizedExpression",
]);

/** Strip `as`, `satisfies`, `!` and parentheses. */
export const unwrap = (node: Node | undefined): Node | undefined => {
  let n = node;
  while (n !== undefined && WRAPPERS.has(n.type)) n = child(n, "expression");
  return n;
};

export const stringValue = (node: Node | undefined): string | undefined => {
  const n = unwrap(node);
  if (n?.type === "Literal") return text(n, "value");
  if (n?.type === "TemplateLiteral" && kids(n, "expressions").length === 0) {
    const quasis = kids(n, "quasis");
    return quasis.length === 1 ? cooked(quasis[0]) : undefined;
  }
  return undefined;
};

/** Property key as a string: `a`, `"a"`, `["a" as string]`. */
export const keyName = (prop: Node): string | undefined => {
  const key = child(prop, "key");
  if (prop["computed"] === true) return stringValue(key);
  if (key?.type === "Identifier") return text(key, "name");
  return stringValue(key);
};

/** JSXOpeningElement / JSXAttribute plain name. */
export const jsxName = (n: Node): string | undefined => {
  const name = child(n, "name");
  return name?.type === "JSXIdentifier" ? text(name, "name") : undefined;
};

const cssCache = new Map<string, { css: string; root: Root }>();
export const parseCss = (path: string, css: string): Root => {
  const hit = cssCache.get(path);
  if (hit?.css === css) return hit.root;
  const root = postcss.parse(css, { from: path });
  cssCache.set(path, { css, root });
  return root;
};

/** Enclosing at-rules of a CSS node, nearest first. */
export const atRuleAncestors = (node: ChildNode): AtRule[] => {
  const out: AtRule[] = [];
  let p: unknown = node.parent;
  while (p instanceof AtRule || p instanceof Rule) {
    if (p instanceof AtRule) out.push(p);
    p = p.parent;
  }
  return out;
};

/** Class names in a selector, ignoring attribute values and strings. */
export const selectorClasses = (selector: string): string[] => {
  const bare = selector.replace(/\[[^\]]*]/g, "").replace(/"[^"]*"|'[^']*'/g, "");
  return [...bare.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1] ?? "");
};

/** `[data-key="value"]` pairs in a selector. */
export const selectorDataAttrs = (selector: string): { key: string; value?: string }[] =>
  [...selector.matchAll(/\[data-([a-z0-9-]+)(?:\s*=\s*"([^"]*)")?\s*]/g)].map((m) =>
    m[2] === undefined ? { key: m[1] ?? "" } : { key: m[1] ?? "", value: m[2] },
  );

export const camel = (kebab: string): string =>
  kebab.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const flatCache = new Map<string, { code: string; nodes: Node[] }>();
/** Every node of a file's AST, flattened once per (path, content) so repeated checks don't re-walk. */
export const forEachNode = (path: string, code: string, visit: (node: Node) => void): void => {
  let entry = flatCache.get(path);
  if (entry?.code !== code) {
    const nodes: Node[] = [];
    walk(parseTs(path, code), (n) => {
      nodes.push(n);
    });
    entry = { code, nodes };
    flatCache.set(path, entry);
  }
  for (const n of entry.nodes) visit(n);
};
