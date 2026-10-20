/**
 * Script checks for ADR-002 "CSS architecture and enforcement" (Keel, R1–R11) and the G4 extras
 * that core stylelint can't express. Each returns violation strings tagged with their rule id.
 * stylelint core rules live in stylelint.config.js and run through ./stylelint.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ChildNode, Declaration, Root } from "postcss";

import {
  atRuleAncestors,
  camel,
  child,
  cooked,
  forEachNode,
  jsxName,
  keyName,
  kids,
  type Node,
  parseCss,
  parseTs,
  selectorClasses,
  selectorDataAttrs,
  stringValue,
  text,
  unwrap,
  walk,
} from "./ast";
import {
  cssFiles,
  dirOf,
  moduleFiles,
  moduleOf,
  ownerOf,
  sourceFiles,
  type Tree,
  V2,
} from "./tree";

export const LAYER_ORDER = "reset, tokens, base, primitives, layout, app, overrides";

const isToken = (p: string): boolean =>
  p.startsWith("design/tokens/") || p === "design/fonts/fonts.css";

const cssRoot = (tree: Tree, path: string): Root => parseCss(path, tree.get(path) ?? "");

const declCache = new WeakMap<Root, Declaration[]>();
const declsOf = (root: Root): Declaration[] => {
  const hit = declCache.get(root);
  if (hit !== undefined) return hit;
  const out: Declaration[] = [];
  declCache.set(root, out);
  root.walkDecls((d) => {
    out.push(d);
  });
  return out;
};

const insideKeyframes = (node: ChildNode): boolean =>
  atRuleAncestors(node).some((a) => /keyframes$/i.test(a.name));

/* ---------- R2: layers ---------- */

export const expectedLayers = (path: string): string[] => {
  if (isToken(path)) return ["tokens"];
  if (path === "design/base/base.css") return ["reset", "base"];
  if (/^design\/primitives\/(Stack|Cluster|Grid)\//.test(path)) return ["layout"];
  if (path.startsWith("design/primitives/")) return ["primitives"];
  if (path.startsWith("app/") || path.startsWith("routes/")) return ["app"];
  return [];
};

export const checkLayers = (tree: Tree): string[] => {
  const out: string[] = [];
  let orderStatements = 0;
  for (const path of cssFiles(tree)) {
    const allowed = expectedLayers(path);
    if (allowed.length === 0) out.push(`R2 ${path}: CSS outside a folder that owns a layer`);
    for (const node of cssRoot(tree, path).nodes) {
      if (node.type === "comment") continue;
      if (node.type === "atrule" && (node.name === "import" || node.name === "charset")) continue;
      if (node.type === "atrule" && node.name === "layer") {
        const params = node.params.replace(/\s+/g, " ").trim();
        if (node.nodes === undefined) {
          if (path === "design/base/base.css" && params === LAYER_ORDER) orderStatements += 1;
          else
            out.push(`R2 ${path}: layer statement "${params}" (only base.css declares the order)`);
          continue;
        }
        if (params === "overrides") out.push(`R2 ${path}: @layer overrides must stay empty`);
        else if (!allowed.includes(params)) {
          out.push(
            `R2 ${path}: @layer ${params}, but this folder owns ${allowed.join("/") || "none"}`,
          );
        }
        continue;
      }
      out.push(
        `R2 ${path}: unlayered ${node.type === "rule" ? node.selector : `@${node.type === "atrule" ? node.name : node.type}`}`,
      );
    }
  }
  if (orderStatements !== 1) {
    out.push(
      `R2 design/base/base.css: expected exactly one "@layer ${LAYER_ORDER};" (found ${orderStatements})`,
    );
  }
  return out;
};

/* ---------- R1: one module per component ---------- */

type Imports = { source: string; local?: string }[];

const importsOf = (tree: Tree, path: string): Imports => {
  const out: Imports = [];
  const program = parseTs(path, tree.get(path) ?? "");
  for (const stmt of kids(program, "body")) {
    if (stmt.type !== "ImportDeclaration") continue;
    const source = stringValue(child(stmt, "source")) ?? "";
    const spec = kids(stmt, "specifiers").find((s) => s.type === "ImportDefaultSpecifier");
    const local = text(child(spec, "local"), "name");
    out.push(local === undefined ? { source } : { source, local });
  }
  return out;
};

const resolveRel = (from: string, source: string): string => {
  const parts = dirOf(from).split("/").filter(Boolean);
  for (const seg of source.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
};

export const classUses = (
  tree: Tree,
  tsx: string,
  stylesName: string,
): { used: Set<string>; dynamic: boolean } => {
  const used = new Set<string>();
  let dynamic = false;
  forEachNode(tsx, tree.get(tsx) ?? "", (n) => {
    if (n.type !== "MemberExpression") return;
    const obj = child(n, "object");
    if (obj?.type !== "Identifier" || text(obj, "name") !== stylesName) return;
    const prop = child(n, "property");
    const name = n["computed"] === true ? stringValue(prop) : text(prop, "name");
    if (name === undefined) dynamic = true;
    else used.add(name);
  });
  return { used, dynamic };
};

export const checkModules = (tree: Tree): string[] => {
  const out: string[] = [];
  const importers = new Map<string, { file: string; local?: string }[]>();
  for (const file of sourceFiles(tree)) {
    for (const imp of importsOf(tree, file)) {
      if (!imp.source.endsWith(".module.css")) continue;
      const target = resolveRel(file, imp.source);
      const list = importers.get(target) ?? [];
      list.push(imp.local === undefined ? { file } : { file, local: imp.local });
      importers.set(target, list);
    }
  }
  for (const mod of moduleFiles(tree)) {
    const owner = ownerOf(mod);
    if (!tree.has(owner)) {
      out.push(`R1 ${mod}: no co-located ${owner.split("/").pop() ?? owner}`);
      continue;
    }
    const list = importers.get(mod) ?? [];
    for (const imp of list)
      if (imp.file !== owner) out.push(`R1 ${imp.file}: imports foreign ${mod}`);
    const own = list.find((i) => i.file === owner);
    if (own?.local === undefined) {
      out.push(`R1 ${mod}: not imported (as a default import) by its own ${owner}`);
      continue;
    }
    const classes = new Set<string>();
    cssRoot(tree, mod).walkRules((rule) => {
      if (insideKeyframes(rule)) return;
      for (const c of selectorClasses(rule.selector)) classes.add(c);
    });
    const { used, dynamic } = classUses(tree, owner, own.local);
    if (dynamic)
      out.push(`R1 ${owner}: computed ${own.local}[expr] access; use a literal class name`);
    for (const c of classes) if (!used.has(c)) out.push(`R1 ${mod}: unused class .${c}`);
    for (const c of used)
      if (!classes.has(c)) out.push(`R1 ${owner}: ${own.local}.${c} does not exist in ${mod}`);
  }
  return out;
};

/* ---------- R4 vars + durations ---------- */

const declaredProps = (tree: Tree, paths: string[]): Set<string> => {
  const names = new Set<string>();
  for (const p of paths)
    for (const d of declsOf(cssRoot(tree, p)))
      if (d.prop.startsWith("--")) names.add(d.prop.slice(2));
  return names;
};

const varRefs = (value: string): string[] =>
  [...value.matchAll(/var\(\s*--([a-zA-Z0-9_-]+)/g)].map((m) => m[1] ?? "");

/** `--dyn-*` keys each component sets in its inline style (see R10). */
export const dynKeysByComponent = (tree: Tree): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>();
  for (const file of sourceFiles(tree)) {
    if (!file.endsWith(".tsx")) continue;
    const keys = new Set<string>();
    for (const { keys: k } of styleObjects(tree, file)) for (const key of k) keys.add(key);
    if (keys.size > 0) out.set(moduleOf(file), keys);
  }
  return out;
};

export const checkVars = (tree: Tree): string[] => {
  const out: string[] = [];
  const tokenPaths = cssFiles(tree).filter(isToken);
  const defined = declaredProps(tree, tokenPaths);
  const dyn = dynKeysByComponent(tree);
  for (const path of cssFiles(tree)) {
    const root = cssRoot(tree, path);
    const local = declaredProps(tree, [path]);
    for (const d of declsOf(root)) {
      for (const name of varRefs(d.value)) {
        if (defined.has(name)) continue;
        if (name.startsWith("_") && local.has(name)) continue;
        if (name.startsWith("dyn-") && dyn.get(path)?.has(`--${name}`) === true) continue;
        out.push(
          `R4 ${path}: var(--${name}) is not a token, a --dyn-* its component sets, or a local --_*`,
        );
      }
      if (/var\([^)]*,/.test(d.value) && !isToken(path))
        out.push(`R4 ${path}: var() fallback in ${d.prop}: ${d.value}`);
    }
  }
  const motion = "design/tokens/motion-etc.css";
  if (tree.has(motion)) {
    for (const d of declsOf(cssRoot(tree, motion))) {
      if (!d.prop.startsWith("--dur-")) continue;
      const m = /^(\d*\.?\d+)(ms|s)$/.exec(d.value.trim());
      if (m === null) continue;
      const ms = Number(m[1]) * (m[2] === "s" ? 1000 : 1);
      if (ms > 400) out.push(`R4 ${motion}: ${d.prop} is ${ms}ms (> 400ms)`);
    }
  }
  return out;
};

/* ---------- R5 tiers + walk tokens ---------- */

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/;
const RAW_LENGTH = /(?<![\w-])\d*\.?\d+(?:px|rem|em|ms|s|vh|vw|%)\b/;

export const checkTiers = (tree: Tree): string[] => {
  const out: string[] = [];
  const palette = "design/tokens/palette.css";
  const paletteNames = tree.has(palette) ? declaredProps(tree, [palette]) : new Set<string>();
  for (const path of cssFiles(tree)) {
    if (path === palette) continue;
    for (const d of declsOf(cssRoot(tree, path))) {
      if (COLOR_LITERAL.test(d.value)) {
        out.push(`R5 ${path}: colour literal in ${d.prop} (raw values live in palette.css)`);
      }
      if (path === "design/tokens/motion-etc.css" && d.prop.startsWith("--shadow-")) {
        for (const name of varRefs(d.value)) {
          if (paletteNames.has(name))
            out.push(`R5 ${path}: ${d.prop} uses palette --${name}; use semantic --shadow-ink`);
        }
      }
      if (path === "design/tokens/semantic.css" && RAW_LENGTH.test(d.value)) {
        out.push(`R5 ${path}: raw value in ${d.prop} (semantic maps onto palette vars only)`);
      }
      if (!isToken(path)) {
        for (const name of varRefs(d.value)) {
          if (paletteNames.has(name))
            out.push(`R5 ${path}: palette var(--${name}); use a semantic name`);
          if (
            (name === "walk-up" || name === "walk-down") &&
            !path.endsWith("LabelGlyphs.module.css")
          ) {
            out.push(`R5 ${path}: --${name} is only for LabelGlyphs`);
          }
        }
      }
    }
  }
  return out;
};

/* ---------- R7 variants ---------- */

const exportedVariants = (tree: Tree, tsx: string): Map<string, string[]> | undefined => {
  const program = parseTs(tsx, tree.get(tsx) ?? "");
  for (const stmt of kids(program, "body")) {
    if (stmt.type !== "ExportNamedDeclaration") continue;
    const decl = child(stmt, "declaration");
    if (decl?.type !== "VariableDeclaration") continue;
    for (const d of kids(decl, "declarations")) {
      if (text(child(d, "id"), "name") !== "variants") continue;
      const obj = unwrap(child(d, "init"));
      if (obj?.type !== "ObjectExpression") return new Map();
      const map = new Map<string, string[]>();
      for (const prop of kids(obj, "properties")) {
        const key = keyName(prop);
        const arr = unwrap(child(prop, "value"));
        if (key === undefined || arr?.type !== "ArrayExpression") continue;
        map.set(
          key,
          kids(arr, "elements")
            .map((e) => stringValue(e))
            .filter((s): s is string => s !== undefined),
        );
      }
      return map;
    }
  }
  return undefined;
};

const touchesStyles = (node: Node): boolean => {
  let hit = false;
  walk(node, (n) => {
    if (n.type === "MemberExpression" && text(child(n, "object"), "name") === "styles") hit = true;
  });
  return hit;
};

export const checkVariants = (tree: Tree): string[] => {
  const out: string[] = [];
  for (const mod of moduleFiles(tree)) {
    const owner = ownerOf(mod);
    const attrs: { key: string; value?: string }[] = [];
    cssRoot(tree, mod).walkRules((rule) => {
      attrs.push(...selectorDataAttrs(rule.selector));
    });
    if (attrs.length === 0 || !tree.has(owner)) continue;
    const variants = exportedVariants(tree, owner);
    if (variants === undefined) {
      out.push(`R7 ${owner}: ${mod} styles data-* variants but ${owner} exports no \`variants\``);
      continue;
    }
    const styled = new Set<string>();
    for (const { key, value } of attrs) {
      const values = variants.get(camel(key));
      if (values === undefined) out.push(`R7 ${mod}: [data-${key}] is not an exported variant key`);
      else if (value !== undefined && !values.includes(value)) {
        out.push(`R7 ${mod}: [data-${key}="${value}"] is not in variants.${camel(key)}`);
      }
      if (value !== undefined) styled.add(`${camel(key)}=${value}`);
    }
    for (const [key, values] of variants) {
      for (const v of values)
        if (!styled.has(`${key}=${v}`)) out.push(`R7 ${mod}: variants.${key} "${v}" has no rule`);
    }
    // Literal data-* values in the owner's JSX must be declared values.
    forEachNode(owner, tree.get(owner) ?? "", (n) => {
      if (n.type !== "JSXAttribute") return;
      const name = jsxName(n);
      if (name?.startsWith("data-") !== true) return;
      const key = camel(name.slice(5));
      const raw = child(n, "value");
      const literal = raw?.type === "Literal" ? stringValue(raw) : undefined;
      const values = variants.get(key);
      if (values === undefined) return;
      if (literal !== undefined && !values.includes(literal)) {
        out.push(`R7 ${owner}: ${name}="${literal}" is not in variants.${key}`);
      }
    });
  }
  // No class lists anywhere in src/v2: className takes one module class, variants go through data-*.
  for (const file of sourceFiles(tree)) {
    if (!file.endsWith(".tsx")) continue;
    forEachNode(file, tree.get(file) ?? "", (n) => {
      if (n.type === "JSXAttribute" && jsxName(n) === "className") {
        const value = child(n, "value");
        const expr =
          value?.type === "JSXExpressionContainer" ? unwrap(child(value, "expression")) : value;
        const ok = expr?.type === "Identifier" || expr?.type === "MemberExpression";
        if (!ok)
          out.push(
            `R7 ${file}: className must be one module class (got ${expr?.type ?? "nothing"})`,
          );
      }
      const listy =
        n.type === "ConditionalExpression" ||
        n.type === "TemplateLiteral" ||
        (n.type === "BinaryExpression" && n["operator"] === "+") ||
        (n.type === "LogicalExpression" && n["operator"] !== "??") ||
        n.type === "ArrayExpression";
      if (listy && touchesStyles(n))
        out.push(`R7 ${file}: conditional or combined class list; use a data-* variant`);
    });
  }
  return [...new Set(out)];
};

/* ---------- R9 motion ---------- */

const NO_PREF = /prefers-reduced-motion\s*:\s*no-preference/;

export const checkMotion = (tree: Tree): string[] => {
  const out: string[] = [];
  for (const path of cssFiles(tree)) {
    for (const d of declsOf(cssRoot(tree, path))) {
      if (insideKeyframes(d)) {
        if (d.prop !== "transform" && d.prop !== "opacity")
          out.push(`R9 ${path}: @keyframes animates ${d.prop}`);
        continue;
      }
      if (!/^(transition|animation)/.test(d.prop) || d.value.trim() === "none") continue;
      const guarded = atRuleAncestors(d).some((a) => a.name === "media" && NO_PREF.test(a.params));
      if (!guarded)
        out.push(`R9 ${path}: ${d.prop} outside @media (prefers-reduced-motion: no-preference)`);
    }
  }
  return out;
};

/* ---------- R10 inline style ---------- */

type StyleObject = { keys: string[]; problems: string[] };

const styleObjects = (tree: Tree, file: string): StyleObject[] => {
  const code = tree.get(file) ?? "";
  const decls = new Map<string, Node | undefined>();
  forEachNode(file, code, (n) => {
    const id = child(n, "id");
    const name = text(id, "name");
    if (n.type === "VariableDeclarator" && id?.type === "Identifier" && name !== undefined) {
      decls.set(name, child(n, "init"));
    }
  });
  const out: StyleObject[] = [];
  forEachNode(file, code, (n) => {
    if (n.type !== "JSXAttribute" || jsxName(n) !== "style") return;
    const value = child(n, "value");
    let expr =
      value?.type === "JSXExpressionContainer" ? unwrap(child(value, "expression")) : undefined;
    if (expr?.type === "Identifier") expr = unwrap(decls.get(text(expr, "name") ?? ""));
    if (expr?.type !== "ObjectExpression") {
      out.push({ keys: [], problems: ["style must be an object literal of --dyn-* properties"] });
      return;
    }
    const keys: string[] = [];
    const problems: string[] = [];
    for (const prop of kids(expr, "properties")) {
      if (prop.type !== "Property") {
        problems.push("spread in style");
        continue;
      }
      const key = keyName(prop);
      if (key === undefined) problems.push("computed style key");
      else keys.push(key);
    }
    out.push({ keys, problems });
  });
  return out;
};

export const checkInlineStyle = (tree: Tree): string[] => {
  const out: string[] = [];
  for (const file of sourceFiles(tree)) {
    if (!file.endsWith(".tsx")) continue;
    const mod = moduleOf(file);
    const css = tree.get(mod) ?? "";
    for (const { keys, problems } of styleObjects(tree, file)) {
      for (const p of problems) out.push(`R10 ${file}: ${p}`);
      for (const key of keys) {
        if (!key.startsWith("--dyn-"))
          out.push(`R10 ${file}: inline style "${key}" (only --dyn-* custom properties)`);
        else if (!new RegExp(`var\\(\\s*${key}\\s*\\)`).test(css)) {
          out.push(`R10 ${file}: ${key} is not consumed by var(${key}) in ${mod}`);
        }
      }
    }
  }
  return out;
};

/* ---------- R11 size ---------- */

/** `sourceCeiling`, when set, replaces the ratchet (Slice 1: Keel's 8,600 B gzip ceiling, scaled). */
export type CssBudget = { sourceBytes: number; ratchet: number; sourceCeiling?: number };
export type Allowlist = { oxlint: string[]; stylelint: string[] };

const readJson = (rel: string): unknown => JSON.parse(readFileSync(join(V2, rel), "utf8"));
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export const loadBudget = (): CssBudget => {
  const raw = readJson("design/css-budget.json");
  if (
    !isRecord(raw) ||
    typeof raw["sourceBytes"] !== "number" ||
    typeof raw["ratchet"] !== "number"
  ) {
    throw new Error("bad css-budget.json");
  }
  const ceiling = raw["sourceCeiling"];
  const base = { sourceBytes: raw["sourceBytes"], ratchet: raw["ratchet"] };
  return typeof ceiling === "number" ? { ...base, sourceCeiling: ceiling } : base;
};

export const loadAllowlist = (): Allowlist => {
  const raw = readJson("design/lint-allowlist.json");
  if (!isRecord(raw)) throw new Error("bad lint-allowlist.json");
  return { oxlint: strings(raw["oxlint"]), stylelint: strings(raw["stylelint"]) };
};

export const cssSourceBytes = (tree: Tree): number =>
  cssFiles(tree).reduce(
    (sum, p) => sum + new TextEncoder().encode(tree.get(p) ?? "").byteLength,
    0,
  );

export const checkSize = (tree: Tree, budget: CssBudget): string[] => {
  const bytes = cssSourceBytes(tree);
  const limit = budget.sourceCeiling ?? Math.floor(budget.sourceBytes * budget.ratchet);
  return bytes > limit ? [`R11 src/v2/**/*.css is ${bytes} B, over the ${limit} B budget`] : [];
};

/* ---------- G4 extras ---------- */

/**
 * Raw controls that are known debt. Empty: feature code composes Select / NumberField / TickToggle.
 * This list may only shrink (the test pins it to the current offenders), so it stays empty.
 */
export const PENDING_RAW_CONTROLS: Record<string, string> = {};

export const rawControls = (tree: Tree): string[] => {
  const out: string[] = [];
  for (const file of sourceFiles(tree)) {
    if (!file.startsWith("app/") || !file.endsWith(".tsx")) continue;
    forEachNode(file, tree.get(file) ?? "", (n) => {
      if (n.type !== "JSXOpeningElement") return;
      const name = jsxName(n);
      if (name === undefined) return;
      const attrs = kids(n, "attributes").map((a) => jsxName(a));
      if (["button", "input", "select", "textarea"].includes(name))
        out.push(`G4 ${file}: raw <${name}>`);
      else if (/^[a-z]/.test(name) && (attrs.includes("onClick") || attrs.includes("onKeyDown"))) {
        out.push(`G4 ${file}: <${name}> used as a control`);
      }
    });
  }
  return [...new Set(out)];
};

export const checkElements = (tree: Tree): string[] =>
  rawControls(tree).filter((v) => {
    const file = v.split(" ")[1]?.replace(/:$/, "") ?? "";
    return PENDING_RAW_CONTROLS[file] === undefined;
  });

export const checkStoryImports = (tree: Tree): string[] => {
  const out: string[] = [];
  for (const file of sourceFiles(tree)) {
    if (!file.endsWith(".stories.tsx")) continue;
    for (const imp of importsOf(tree, file)) {
      if (/^@(storybook|ladle)\//.test(imp.source) || imp.source === "storybook") {
        out.push(`G4 ${file}: imports ${imp.source} (stories stay plain CSF)`);
      }
    }
  }
  return out;
};

export const checkSuffixBtc = (tree: Tree): string[] => {
  const out: string[] = [];
  for (const file of sourceFiles(tree)) {
    forEachNode(file, tree.get(file) ?? "", (n) => {
      let literal: string | undefined;
      if (n.type === "Literal" || n.type === "JSXText") literal = text(n, "value");
      else if (n.type === "TemplateElement") literal = cooked(n);
      if (literal !== undefined && /\d\s?₿/.test(literal))
        out.push(`G4 ${file}: suffix ₿ in "${literal}"`);
    });
  }
  return out;
};

export const checkSuppressions = (tree: Tree, allow: Allowlist): string[] => {
  const out: string[] = [];
  for (const [path, source] of tree) {
    for (const m of source.matchAll(/(oxlint|eslint|stylelint)-disable[\w-]*/g)) {
      const listed = m[1] === "stylelint" ? allow.stylelint : allow.oxlint;
      if (!listed.includes(path)) out.push(`G4 ${path}: ${m[0]} is not in lint-allowlist.json`);
    }
  }
  return out;
};

/** Every script rule over one tree (stylelint runs separately; it is async and heavier). */
export const runScriptRules = (tree: Tree, budget: CssBudget, allow: Allowlist): string[] => [
  ...checkModules(tree),
  ...checkLayers(tree),
  ...checkVars(tree),
  ...checkTiers(tree),
  ...checkVariants(tree),
  ...checkMotion(tree),
  ...checkInlineStyle(tree),
  ...checkSize(tree, budget),
  ...checkElements(tree),
  ...checkStoryImports(tree),
  ...checkSuffixBtc(tree),
  ...checkSuppressions(tree, allow),
];
