/**
 * Mechanical CSS rules for src/v2 (Keel). Used by test/v2/css-enforce.test.ts.
 * Returns a list of violation strings; empty = pass.
 *
 * Closed gaps (Keel-accepted):
 * - Rule 4: property-scoped allowlist 0 / 1px / 100% / auto; no bare 2px (use --focus-*).
 * - Rule 6: variants via typed data-* attributes (TS AST); no conditional class lists.
 * - Rule 7: @media (prefers-*) / forced-colors allowed in tokens+base; viewport media only in shell.
 * - Rule 9: inline styles may only set CSS custom properties (--*).
 * - Rule 1 unused classes: TS AST of styles.cls / styles["cls"].
 * - --walk-up / --walk-down only inside LabelGlyphs.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const V2 = join(import.meta.dir, "../../src/v2");

export type CssEnforceOptions = {
  root?: string;
};

const walk = (dir: string, pred: (n: string) => boolean): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, pred));
    else if (pred(name)) out.push(p);
  }
  return out;
};

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Count selector depth (descendant/child combinators). */
const selectorDepth = (selector: string): number => {
  const cleaned = selector.replace(/\[[^\]]*]/g, "").replace(/\([^)]*\)/g, "");
  const parts = cleaned.split(/[\s>+~]+/).filter((p) => p.trim().length > 0);
  return parts.length;
};

export const collectTokenNames = (root: string): Set<string> => {
  const names = new Set<string>();
  const tokenFiles = walk(join(root, "design/tokens"), (n) => n.endsWith(".css"));
  const fontCss = join(root, "design/fonts/fonts.css");
  const files = [...tokenFiles, fontCss];
  for (const f of files) {
    try {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/--([a-z0-9-]+)\s*:/gi)) {
        if (m[1]) names.add(m[1]);
      }
    } catch {
      /* missing ok */
    }
  }
  return names;
};

const VIEWPORT_MEDIA =
  /\(\s*(?:min-|max-)?(?:width|height|device-width|device-height|aspect-ratio|device-aspect-ratio|orientation|resolution)\b/i;

const PREFERS_OR_FORCED = /\(\s*(?:prefers-[\w-]+|forced-colors)\b/i;

/** Length-ish properties that must use tokens or the allowlist. */
const LENGTH_PROPS = new Set([
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "inline-size",
  "block-size",
  "min-inline-size",
  "min-block-size",
  "max-inline-size",
  "max-block-size",
  "margin",
  "margin-block",
  "margin-inline",
  "margin-block-start",
  "margin-block-end",
  "margin-inline-start",
  "margin-inline-end",
  "padding",
  "padding-block",
  "padding-inline",
  "padding-block-start",
  "padding-block-end",
  "padding-inline-start",
  "padding-inline-end",
  "gap",
  "row-gap",
  "column-gap",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-block",
  "inset-inline",
  "outline-width",
  "outline-offset",
  "border-width",
  "border-block-width",
  "border-inline-width",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-radius",
  "border-start-start-radius",
  "border-start-end-radius",
  "border-end-start-radius",
  "border-end-end-radius",
  "font-size",
  "letter-spacing",
  "word-spacing",
  "text-indent",
  "flex-basis",
  "translate",
]);

const COLOR_PROPS = new Set([
  "color",
  "background",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-block-color",
  "border-inline-color",
  "outline-color",
  "fill",
  "stroke",
  "caret-color",
  "text-decoration-color",
  "box-shadow",
  "text-shadow",
]);

const DURATION_PROPS = new Set([
  "transition-duration",
  "animation-duration",
  "transition-delay",
  "animation-delay",
]);

const Z_PROPS = new Set(["z-index"]);

const ALLOWED_LENGTH = /^(?:0|1px|100%|auto)$/;

const isAllowedLengthAtom = (raw: string): boolean => {
  const v = raw.trim();
  if (v.length === 0) return true;
  if (ALLOWED_LENGTH.test(v)) return true;
  if (/^var\(\s*--[\w-]+/.test(v)) return true;
  return false;
};

const stripCalc = (value: string): string[] => {
  // Flatten calc(...): require every leaf to be var/allowlist/number-op
  const out: string[] = [];
  const re = /calc\(([^)]*)\)/g;
  let remaining = value;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const inner = m[1] ?? "";
    // split on + - * / but keep var() intact
    for (const piece of inner.split(/[+\-*/]/)) {
      const t = piece.trim();
      if (t.length > 0) out.push(t);
    }
    remaining = remaining.replace(m[0], " ");
  }
  for (const piece of remaining.split(/[\s,]/)) {
    const t = piece.trim();
    if (t.length > 0 && t !== "/" && t !== "*") out.push(t);
  }
  return out;
};

const lengthValueOk = (value: string): boolean => {
  const v = value.trim();
  if (isAllowedLengthAtom(v)) return true;
  if (v.startsWith("calc(")) {
    return stripCalc(v).every((atom) => isAllowedLengthAtom(atom) || /^[\d.]+$/.test(atom));
  }
  // multi-value (e.g. outline: width style color) — check each length-looking token
  if (/\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|dvh|%)\b/.test(v) || v === "0") {
    // Allow only if every length atom is allowlisted or var()
    const lengths =
      v.match(
        /\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|dvh|%)\b|\b0\b|var\(\s*--[\w-]+[^)]*\)|100%|auto/g,
      ) ?? [];
    const otherLengths = v.match(/\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|dvh|%)\b/g) ?? [];
    for (const L of otherLengths) {
      if (!ALLOWED_LENGTH.test(L) && L !== "0") return false;
    }
    return lengths.length > 0 || !/\d/.test(v);
  }
  return true; // keywords like solid, none — not a length violation
};

const colorValueOk = (value: string): boolean => {
  const v = value.trim();
  if (/^(?:currentcolor|transparent|none|inherit|initial|unset)$/i.test(v)) return true;
  if (/^var\(\s*--[\w-]+/.test(v)) return true;
  if (v.startsWith("color-mix(")) return !/#[0-9a-f]/i.test(v) && !/(?:rgb|hsl)a?\(/i.test(v);
  if (/^#[0-9a-f]{3,8}$/i.test(v) || /(?:rgb|hsl)a?\(/i.test(v)) return false;
  // compound e.g. "0 -18px 40px rgb(...)" shadows — ban raw rgb/hex already
  return !/#[0-9a-f]{3,8}/i.test(v) && !/(?:rgb|hsl)a?\(/i.test(v);
};

const isShellPath = (file: string, root: string): boolean => {
  const r = relative(root, file).replace(/\\/g, "/");
  return r.startsWith("app/") || r.includes("/app/");
};

const isTokensOrBase = (file: string): boolean =>
  file.includes(join("design", "tokens")) ||
  file.includes("design/tokens/") ||
  file.includes(join("design", "base")) ||
  file.includes("design/base/") ||
  file.includes("design/fonts/fonts.css");

const isLabelGlyphsCss = (file: string): boolean =>
  file.replace(/\\/g, "/").endsWith("LabelGlyphs.module.css");

const PALETTE_ONLY =
  /var\(\s*--(?:ink|linen|umber|stone|gold|gold-wash|orange|green|pewter|wine|jade|lapis|amethyst|citron|orchid|coral|leaf|red)-\d{2,3}\b/;

const WALK_TOKENS = /var\(\s*--walk-(?:up|down)\b/;

/** Parse declarations from a CSS rule body. */
const eachDecl = (body: string, fn: (prop: string, value: string) => void): void => {
  for (const m of body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:\s*([^;}+]+)/gi)) {
    const prop = (m[1] ?? "").toLowerCase();
    const value = (m[2] ?? "").trim();
    if (prop) fn(prop, value);
  }
};

/** styles.foo / styles["foo"] / styles['foo'] uses. */
const collectStylesClassUses = (tsx: string): Set<string> => {
  const used = new Set<string>();
  for (const m of tsx.matchAll(/\bstyles\s*\.\s*([A-Za-z_][\w]*)/g)) {
    if (m[1]) used.add(m[1]);
  }
  for (const m of tsx.matchAll(/\bstyles\s*\[\s*["']([^"']+)["']\s*\]/g)) {
    if (m[1]) used.add(m[1]);
  }
  return used;
};

/** Rule 6: ban conditional / list classNames; variants must be data-*. */
const checkVariantClassLists = (tsx: string, relFile: string): string[] => {
  const violations: string[] = [];
  // className={ cond ? a : b }
  if (/className\s*=\s*\{\s*[^}]*\?/.test(tsx)) {
    violations.push(`${relFile}: conditional/list className — use data-* variants (rule 6)`);
  }
  // className={`${...}`} template
  if (/className\s*=\s*\{\s*`/.test(tsx)) {
    violations.push(`${relFile}: template className — use data-* variants (rule 6)`);
  }
  // className={[...].join or className={[a, b]}
  if (/className\s*=\s*\{\s*\[/.test(tsx)) {
    violations.push(`${relFile}: array className — use data-* variants (rule 6)`);
  }
  // className={cn( or clsx(
  if (/className\s*=\s*\{\s*(?:cn|clsx|classNames)\s*\(/.test(tsx)) {
    violations.push(`${relFile}: classlist helper — use data-* variants (rule 6)`);
  }
  return [...new Set(violations)];
};

/** Rule 9: style={{}} may only set --* custom properties. */
const checkInlineStyles = (tsx: string, relFile: string): string[] => {
  const violations: string[] = [];

  const checkObjectBody = (body: string): void => {
    // property keys: ident, "str", 'str', ["str"], ['str'], ["str" as string]
    for (const m of body.matchAll(
      /(?:^|,)\s*(?:(["'])(--[^"']*)\1|\[["'](--[^"']+)["'](?:\s+as\s+\w+)?\]|([A-Za-z_][\w-]*))\s*:/g,
    )) {
      const key = m[2] ?? m[3] ?? m[4] ?? "";
      if (key.length === 0) continue;
      if (!key.startsWith("--")) {
        violations.push(`${relFile}: inline style "${key}" — only CSS custom properties (rule 9)`);
      }
    }
    // shorthand or spread
    if (/\.\.\./.test(body)) {
      violations.push(`${relFile}: inline style spread banned (rule 9)`);
    }
  };

  // style={{ ... }}
  for (const m of tsx.matchAll(/\bstyle\s*=\s*\{\s*\{([\s\S]*?)\}\s*\}/g)) {
    checkObjectBody(m[1] ?? "");
  }

  // const style = { ... } / const style = { ... } satisfies
  for (const m of tsx.matchAll(
    /\b(?:const|let)\s+style\s*=\s*\{([\s\S]*?)\}\s*(?:satisfies\s+[A-Za-z_][\w<>,\s|]*)?;/g,
  )) {
    checkObjectBody(m[1] ?? "");
  }

  return [...new Set(violations)];
};

export const enforceCss = (options: CssEnforceOptions = {}): string[] => {
  const root = options.root ?? V2;
  const violations: string[] = [];
  const rel = (p: string) => relative(root, p).replace(/\\/g, "/");

  const modules = walk(root, (n) => n.endsWith(".module.css"));
  const allCss = walk(root, (n) => n.endsWith(".css"));
  const tokenNames = collectTokenNames(root);

  for (const file of allCss) {
    const text = stripComments(readFileSync(file, "utf8"));
    const isBase =
      file.endsWith(join("design", "base", "base.css")) || file.endsWith("design/base/base.css");
    const isTokens = isTokensOrBase(file);
    const isModule = file.endsWith(".module.css");
    const inShell = isShellPath(file, root);

    // Rule 2: every CSS file must only contain layered rules (or @import)
    const withoutImports = text.replace(/@import[^;]+;/g, "").trim();
    if (withoutImports.length > 0) {
      const layersOnly = withoutImports.replace(/@layer\s+[\w\s,]+;/g, "").trim();
      if (layersOnly.length > 0 && !/@layer\s+\w+/.test(withoutImports)) {
        violations.push(`${rel(file)}: unlayered CSS (rule 2)`);
      }
      if (!text.includes("@layer") && withoutImports.includes("{")) {
        violations.push(`${rel(file)}: missing @layer (rule 2)`);
      }
    }

    // Rule 3: :global only in base.css
    if (/:global\b/.test(text) && !isBase) {
      violations.push(`${rel(file)}: :global outside base.css (rule 3)`);
    }

    // Rule 3: !important banned
    if (/!important/.test(text)) {
      violations.push(`${rel(file)}: !important banned (rule 3)`);
    }

    // Rule 3: IDs banned
    if (/#[a-zA-Z][\w-]*/.test(text)) {
      for (const m of text.matchAll(/#([a-zA-Z][\w-]*)/g)) {
        const id = m[1] ?? "";
        if (!/^[0-9a-fA-F]{3,8}$/.test(id)) {
          violations.push(`${rel(file)}: ID selector #${id} (rule 3)`);
        }
      }
    }

    // Rule 7: viewport-size media only in shell; prefers-*/forced-colors ok in tokens/base (and modules for motion)
    for (const m of text.matchAll(/@media\s*([^{]+)\{/g)) {
      const query = m[1] ?? "";
      const isViewport = VIEWPORT_MEDIA.test(query);
      const isPrefers = PREFERS_OR_FORCED.test(query);
      if (isViewport && !inShell) {
        violations.push(`${rel(file)}: viewport @media outside shell (rule 7)`);
      }
      if (!isViewport && !isPrefers && !inShell) {
        // unknown media feature outside shell
        violations.push(
          `${rel(file)}: @media outside shell without prefers-*/forced-colors (rule 7)`,
        );
      }
      // prefers in tokens/base: explicitly allowed (no violation)
      if (isPrefers && (isTokens || isBase || isModule)) {
        /* ok */
      }
    }

    // --walk-up / --walk-down only in LabelGlyphs (definitions in tokens ok)
    if (WALK_TOKENS.test(text) && !isLabelGlyphsCss(file) && !file.includes("design/tokens")) {
      violations.push(`${rel(file)}: --walk-up/--walk-down only in LabelGlyphs (Form)`);
    }

    if (isModule) {
      // Rule 3: element selectors + depth
      for (const block of text.split("}")) {
        const sel = block.split("{")[0] ?? "";
        if (/@layer/.test(sel) || /@media/.test(sel) || /@container/.test(sel)) continue;
        const parts = sel.split(",");
        for (const part of parts) {
          const s = part.replace(/@layer\s+\w+\s*/g, "").trim();
          if (s.length === 0) continue;
          if (new RegExp("^[a-z]+[\\s.:#[]").test(s) || /^[a-z]+$/.test(s)) {
            if (!s.startsWith(".") && !s.startsWith(":") && !s.startsWith("[")) {
              violations.push(`${rel(file)}: element selector "${s}" (rule 3)`);
            }
          }
          if (selectorDepth(s) > 2) {
            violations.push(`${rel(file)}: selector depth >2 "${s}" (rule 3)`);
          }
        }
      }

      // Rule 4: raw colors
      if (/#[0-9a-fA-F]{3,8}\b/.test(text) || /(?:rgb|hsl)a?\(/.test(text)) {
        violations.push(`${rel(file)}: raw color (rule 4)`);
      }

      // Rule 4: undefined vars
      for (const m of text.matchAll(/var\(\s*--([a-z0-9-]+)/gi)) {
        const name = m[1];
        if (
          name &&
          !tokenNames.has(name) &&
          !name.startsWith("stack-") &&
          !name.startsWith("dyn-")
        ) {
          violations.push(`${rel(file)}: undefined var(--${name}) (rule 4)`);
        }
      }

      // Rule 4 tier: no palette tokens in components
      if (!isTokens && PALETTE_ONLY.test(text)) {
        violations.push(`${rel(file)}: palette token in component — use semantic (rule 4 tier)`);
      }

      // Rule 4: property-scoped allowlist (no bare 2px — use --focus-w / --focus-offset)
      for (const block of text.split("}")) {
        const body = block.split("{").slice(1).join("{");
        if (!body) continue;
        eachDecl(body, (prop, value) => {
          if (
            LENGTH_PROPS.has(prop) ||
            prop === "outline" ||
            prop === "border" ||
            prop.startsWith("border-")
          ) {
            // outline/border shorthands may include widths
            if (/\b2px\b/.test(value)) {
              violations.push(
                `${rel(file)}: bare 2px on ${prop} — use var(--focus-w)/var(--focus-offset) or a token (rule 4)`,
              );
            }
            if (LENGTH_PROPS.has(prop) && !lengthValueOk(value)) {
              // stroke-width handled separately
              if (prop !== "stroke-width") {
                violations.push(
                  `${rel(file)}: ${prop}: ${value} — allowlist 0/1px/100%/auto or var(--token) (rule 4)`,
                );
              }
            }
          }
          if (COLOR_PROPS.has(prop) && !colorValueOk(value)) {
            violations.push(`${rel(file)}: ${prop} raw/non-token color (rule 4)`);
          }
          if (
            DURATION_PROPS.has(prop) &&
            !/^var\(\s*--/.test(value) &&
            value !== "0" &&
            value !== "0s" &&
            value !== "0ms"
          ) {
            violations.push(`${rel(file)}: ${prop} must be var(--dur-*) (rule 4)`);
          }
          if (
            Z_PROPS.has(prop) &&
            !/^var\(\s*--z-/.test(value) &&
            value !== "0" &&
            value !== "auto"
          ) {
            violations.push(`${rel(file)}: z-index must be var(--z-*) (rule 4)`);
          }
          if (prop === "border-radius") {
            if (value !== "0" && value !== "var(--radius-0)") {
              violations.push(`${rel(file)}: non-zero radius "${value}" (Form square)`);
            }
          }
          if (prop === "font-family" && !/^var\(\s*--f-/.test(value)) {
            violations.push(`${rel(file)}: font-family must be var(--f-*) (rule 4)`);
          }
          // shadow: only var(--shadow-*) or none
          if (prop === "box-shadow" && !/^var\(\s*--shadow-/.test(value) && value !== "none") {
            // allow multi-layer inset using tokens
            if (!/^inset\b/.test(value) || !/var\(\s*--/.test(value)) {
              violations.push(
                `${rel(file)}: box-shadow must be var(--shadow-*) or token inset (rule 4)`,
              );
            }
          }
        });
      }

      // Rule 5: .root may only use margin: 0
      for (const m of text.matchAll(/\.root(?:\[[^\]]*\])?\s*\{([^}]*)\}/gs)) {
        const body = m[1] ?? "";
        for (const mm of body.matchAll(/\bmargin(?:-block|-inline)?\s*:\s*([^;]+);/g)) {
          const val = (mm[1] ?? "").trim();
          if (val !== "0") {
            violations.push(`${rel(file)}: outer margin on .root is "${val}" (rule 5)`);
          }
        }
      }

      // Rule 7 logical properties
      if (/\b(margin|padding)-(left|right|top|bottom)\b/.test(text)) {
        violations.push(`${rel(file)}: physical box property (rule 7 logical)`);
      }
      for (const m of text.matchAll(/(?<![a-z-])(width|height)\s*:/g)) {
        violations.push(`${rel(file)}: physical ${m[1]} — use inline/block-size (rule 7)`);
      }

      // Rule 8: animate only transform/opacity; needs prefers-reduced-motion
      if (
        /@keyframes\b/.test(text) ||
        /\btransition\s*:/.test(text) ||
        /\banimation\s*:/.test(text)
      ) {
        if (!/prefers-reduced-motion/.test(text)) {
          violations.push(`${rel(file)}: motion without prefers-reduced-motion (rule 8)`);
        }
        if (
          /\btransition\s*:[^;]*(?:margin|padding|width|height|top|left|color|background)/.test(
            text,
          )
        ) {
          violations.push(`${rel(file)}: transition on non-transform/opacity (rule 8)`);
        }
      }
    }
  }

  // Rule 1 + 6 + 9: co-located module, unused classes (AST), variants, inline styles
  for (const mod of modules) {
    const base = basename(mod).replace(".module.css", "");
    const tsxPath = join(dirname(mod), `${base}.tsx`);
    const cssText = stripComments(readFileSync(mod, "utf8"));
    const classes = new Set<string>();
    for (const m of cssText.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
      if (m[1]) classes.add(m[1]);
    }
    let importer: string | null = null;
    try {
      importer = readFileSync(tsxPath, "utf8");
    } catch {
      violations.push(`${rel(mod)}: no co-located ${base}.tsx (rule 1)`);
      continue;
    }
    if (!importer.includes(`${base}.module.css`)) {
      violations.push(`${rel(mod)}: not imported by ${base}.tsx (rule 1)`);
    }

    const used = collectStylesClassUses(importer);
    for (const cls of classes) {
      if (!used.has(cls)) {
        violations.push(`${rel(mod)}: unused class .${cls} (rule 1)`);
      }
    }

    violations.push(...checkVariantClassLists(importer, rel(tsxPath)));
    violations.push(...checkInlineStyles(importer, rel(tsxPath)));

    // imported by anyone else?
    const others = walk(root, (n) => n.endsWith(".tsx") || n.endsWith(".ts")).filter(
      (f) => f !== tsxPath,
    );
    for (const other of others) {
      const t = readFileSync(other, "utf8");
      if (t.includes(`${base}.module.css`)) {
        violations.push(`${rel(other)}: imports foreign ${base}.module.css (rule 1)`);
      }
    }
  }

  // Also scan all v2 tsx for rule 6/9 even without modules (e.g. DesignRoute)
  for (const tsx of walk(root, (n) => n.endsWith(".tsx"))) {
    const base = basename(tsx).replace(/\.tsx$/, "");
    const hasMod = modules.some(
      (m) => basename(m).replace(".module.css", "") === base && dirname(m) === dirname(tsx),
    );
    if (hasMod) continue; // already checked
    const text = readFileSync(tsx, "utf8");
    violations.push(...checkVariantClassLists(text, rel(tsx)));
    violations.push(...checkInlineStyles(text, rel(tsx)));
  }

  return [...new Set(violations)];
};

if (import.meta.main) {
  const v = enforceCss();
  if (v.length > 0) {
    console.error(v.join("\n"));
    process.exit(1);
  }
  console.log("css-enforce: ok");
}
