/**
 * Mechanical CSS rules for src/v2 (Keel). Used by test/v2/css-enforce.test.ts.
 * Returns a list of violation strings; empty = pass.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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

export const enforceCss = (options: CssEnforceOptions = {}): string[] => {
  const root = options.root ?? V2;
  const violations: string[] = [];
  const rel = (p: string) => relative(root, p);

  const modules = walk(root, (n) => n.endsWith(".module.css"));
  const allCss = walk(root, (n) => n.endsWith(".css"));
  const tokenNames = collectTokenNames(root);

  // Palette token prefixes that components must not use directly
  // Tier-2: components must not reach into raw type/space scales or ink/gold aliases.
  const paletteOnly =
    /var\(\s*--(?:ink|linen|umber|stone|gold|orange|green|pewter|wine|jade|lapis|amethyst|citron|orchid|coral)-\d{2,3}\b/;

  for (const file of allCss) {
    const text = stripComments(readFileSync(file, "utf8"));
    const isBase =
      file.endsWith(join("design", "base", "base.css")) || file.endsWith("design/base/base.css");
    const isTokens =
      file.includes(join("design", "tokens")) || file.includes("design/fonts/fonts.css");
    const isModule = file.endsWith(".module.css");

    // Rule 2: every CSS file must only contain layered rules (or @import)
    const withoutImports = text.replace(/@import[^;]+;/g, "").trim();
    if (withoutImports.length > 0) {
      // Allow the layer order declaration in base.css
      const layersOnly = withoutImports.replace(/@layer\s+[\w\s,]+;/g, "").trim();
      if (layersOnly.length > 0 && !/@layer\s+\w+/.test(withoutImports)) {
        violations.push(`${rel(file)}: unlayered CSS (rule 2)`);
      }
      // Detect rules outside @layer by crude scan: property blocks after } that aren't inside layer
      // Simpler: if file has `{` content and no @layer at all
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
    if (/#[a-zA-Z][\w-]*/.test(text) && !text.includes("#root")) {
      // hex colors also match # — filter hex
      for (const m of text.matchAll(/#([a-zA-Z][\w-]*)/g)) {
        const id = m[1] ?? "";
        if (!/^[0-9a-fA-F]{3,8}$/.test(id)) {
          violations.push(`${rel(file)}: ID selector #${id} (rule 3)`);
        }
      }
    }

    if (isModule) {
      // Rule 3: element selectors in modules (tag names at start of selector)
      for (const block of text.split("}")) {
        const sel = block.split("{")[0] ?? "";
        if (/@layer/.test(sel)) continue;
        const parts = sel.split(",");
        for (const part of parts) {
          const s = part.replace(/@layer\s+\w+\s*/g, "").trim();
          if (s.length === 0) continue;
          // element = starts with lowercase tag
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

      // Rule 4: raw values — only var(--token) or allowlist for color/space/font/radius/shadow/z/duration
      // Ban hex/rgb in modules
      if (/#[0-9a-fA-F]{3,8}\b/.test(text) || /(?:rgb|hsl)a?\(/.test(text)) {
        violations.push(`${rel(file)}: raw color (rule 4)`);
      }
      for (const m of text.matchAll(/var\(\s*--([a-z0-9-]+)/gi)) {
        const name = m[1];
        if (name && !tokenNames.has(name) && !name.startsWith("stack-")) {
          // --stack-gap is inline dynamic (rule 9)
          violations.push(`${rel(file)}: undefined var(--${name}) (rule 4)`);
        }
      }
      if (!isTokens && paletteOnly.test(text)) {
        violations.push(`${rel(file)}: palette token in component — use semantic (rule 4 tier)`);
      }

      // Rule 5: .root may only use margin: 0 (layout via Stack/Cluster/Grid gaps)
      for (const m of text.matchAll(/\.root(?:\[[^\]]*\])?\s*\{([^}]*)\}/gs)) {
        const body = m[1] ?? "";
        for (const mm of body.matchAll(/\bmargin\s*:\s*([^;]+);/g)) {
          const val = (mm[1] ?? "").trim();
          if (val !== "0") {
            violations.push(`${rel(file)}: outer margin on .root is "${val}" (rule 5)`);
          }
        }
      }

      // Square only: border-radius must be 0 or var(--radius-0)
      for (const m of text.matchAll(/border-radius\s*:\s*([^;]+);/g)) {
        const val = (m[1] ?? "").trim();
        if (val !== "0" && val !== "var(--radius-0)") {
          violations.push(`${rel(file)}: non-zero radius "${val}" (Form square)`);
        }
      }

      // Rule 7: no @media in modules (shell only; Form motion-etc is tokens)
      if (/@media\b/.test(text)) {
        violations.push(`${rel(file)}: @media in module — shell only (rule 7)`);
      }
      // Prefer logical properties: ban physical margin/padding/width/height left/right/top/bottom
      if (/\b(margin|padding)-(left|right|top|bottom)\b/.test(text)) {
        violations.push(`${rel(file)}: physical box property (rule 7 logical)`);
      }
      if (/\b(width|height)\s*:/.test(text) && !/min-|max-|inline-|block-/.test(text)) {
        // width/height still appear — flag physical width/height
        for (const m of text.matchAll(/(?<![a-z-])(width|height)\s*:/g)) {
          violations.push(`${rel(file)}: physical ${m[1]} — use inline/block-size (rule 7)`);
        }
      }

      // Rule 8: animate only transform/opacity; must be inside prefers-reduced-motion or paired
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

  // Rule 1: each .module.css imported only by its co-located component; unused classes fail
  for (const mod of modules) {
    const base = mod.split("/").pop()?.replace(".module.css", "") ?? "";
    const tsx = join(mod, "..", `${base}.tsx`);
    const cssText = stripComments(readFileSync(mod, "utf8"));
    const classes = new Set<string>();
    for (const m of cssText.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
      if (m[1]) classes.add(m[1]);
    }
    let importer: string | null = null;
    try {
      importer = readFileSync(tsx, "utf8");
    } catch {
      violations.push(`${rel(mod)}: no co-located ${base}.tsx (rule 1)`);
      continue;
    }
    if (!importer.includes(`${base}.module.css`)) {
      violations.push(`${rel(mod)}: not imported by ${base}.tsx (rule 1)`);
    }
    // unused classes
    for (const cls of classes) {
      // data-attribute selectors etc. still count; check styles["cls"] or styles.cls or .cls in tsx string
      const used =
        importer.includes(`"${cls}"`) ||
        importer.includes(`'${cls}'`) ||
        importer.includes(`.${cls}`) ||
        importer.includes(`[${JSON.stringify(cls)}]`) ||
        importer.includes(`["${cls}"]`) ||
        importer.includes(`['${cls}']`);
      if (!used) {
        violations.push(`${rel(mod)}: unused class .${cls} (rule 1)`);
      }
    }
    // imported by anyone else?
    const others = walk(root, (n) => n.endsWith(".tsx") || n.endsWith(".ts")).filter(
      (f) => f !== tsx,
    );
    for (const other of others) {
      const t = readFileSync(other, "utf8");
      if (t.includes(`${base}.module.css`)) {
        violations.push(`${rel(other)}: imports foreign ${base}.module.css (rule 1)`);
      }
    }
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
