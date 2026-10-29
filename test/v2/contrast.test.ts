/**
 * G1: WCAG contrast computed from the repo's own palette.css + semantic.css (both themes, through
 * var() and color-mix()) must match Form's v2.1 table (tokens/contrast.txt) and meet its floors.
 * Port of Form's contrast.py.
 */
import { file } from "bun";
import { expect, test } from "bun:test";

const dir = `${import.meta.dir}/../../src/v2/design/tokens`;

type Env = Record<string, string>;

const blocks = (css: string): Map<string, Env> => {
  const out = new Map<string, Env>();
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (m[1] ?? "").replace(/[\s"]/g, "");
    const env = out.get(selector) ?? {};
    for (const d of (m[2] ?? "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      if (d[1] !== undefined && d[2] !== undefined) env[d[1]] = d[2].trim();
    }
    out.set(selector, env);
  }
  return out;
};

const hex = (h: string): number[] => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));

const resolve = (env: Env, value: string, depth = 0): string => {
  if (depth > 20) throw new Error(`var cycle at ${value}`);
  const v = value.trim();
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref?.[1] !== undefined) {
    const next = env[ref[1]];
    if (next === undefined) throw new Error(`undefined ${ref[1]}`);
    return resolve(env, next, depth + 1);
  }
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\S+),\s*(.+)\)$/.exec(v);
  if (mix !== null) {
    const a = hex(resolve(env, mix[1] ?? "", depth + 1));
    const b = hex(resolve(env, mix[3] ?? "", depth + 1));
    const t = Number.parseFloat(resolve(env, mix[2] ?? "", depth + 1)) / 100;
    return `#${a
      .map((x, i) =>
        Math.round(x * t + (b[i] ?? 0) * (1 - t))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  }
  return v;
};

const luminance = (h: string): number => {
  const [r = 0, g = 0, b = 0] = hex(h)
    .map((x) => x / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a: string, b: string): number => {
  const [lo, hi] = [luminance(a), luminance(b)].toSorted((x, y) => x - y);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

const themes = async (): Promise<Record<"dark" | "linen", Env>> => {
  const palette = blocks(await file(`${dir}/palette.css`).text()).get(":root") ?? {};
  const semantic = blocks(await file(`${dir}/semantic.css`).text());
  return {
    dark: { ...palette, ...semantic.get(":root,[data-theme=dark]") },
    // [data-theme=linen] sits on top of :root, so unset names inherit the dark values.
    linen: {
      ...palette,
      ...semantic.get(":root,[data-theme=dark]"),
      ...semantic.get("[data-theme=linen]"),
    },
  };
};

type Row = {
  theme: "dark" | "linen";
  fg: string;
  bg: string;
  ratio: number;
  floor: number;
  note: string;
};

const table = async (): Promise<Row[]> => {
  const rows: Row[] = [];
  let walk = false;
  for (const line of (await file(`${dir}/contrast.txt`).text()).split("\n")) {
    if (line.startsWith("walk dots")) walk = true;
    const cols = line.trim().split(/\s+/);
    const theme = cols[0];
    if (theme !== "dark" && theme !== "linen") continue;
    if (walk) {
      rows.push({
        theme,
        fg: cols[1] ?? "",
        bg: cols[2] ?? "",
        ratio: Number(cols[3]),
        floor: 3,
        note: "",
      });
    } else {
      rows.push({
        theme,
        fg: cols[1] ?? "",
        bg: cols[2] ?? "",
        ratio: Number(cols[4]),
        floor: Number(cols[5]),
        note: cols.slice(6).join(" "),
      });
    }
  }
  return rows;
};

/**
 * Below-floor pairs Form keeps on purpose (usage rules, not token misses):
 * - linen ₿ on raised (3.98): no data text on linen raised surfaces.
 */
const USAGE_EXCEPTIONS = new Set(["linen btc raised"]);

test("G1: every pair in Form's v2.1 contrast table matches the repo tokens (±0.005)", async () => {
  const env = await themes();
  const rows = await table();
  expect(rows.length).toBe(122); // 168 less the 8 retired text-faint rows (§13) and the 38 --selected rows (V32-BUILD:859, K1)
  const drift: string[] = [];
  for (const r of rows) {
    const got = ratio(
      resolve(env[r.theme], `var(--${r.fg})`),
      resolve(env[r.theme], `var(--${r.bg})`),
    );
    if (Math.abs(got - r.ratio) > 0.0051)
      drift.push(`${r.theme} ${r.fg} on ${r.bg}: ${got.toFixed(3)} vs ${r.ratio}`);
  }
  expect(drift).toEqual([]);
});

test("G1: every pair meets its floor except Form's listed usage exceptions", async () => {
  const env = await themes();
  const below: string[] = [];
  for (const r of await table()) {
    const got = ratio(
      resolve(env[r.theme], `var(--${r.fg})`),
      resolve(env[r.theme], `var(--${r.bg})`),
    );
    const key = `${r.theme} ${r.fg} ${r.bg}`;
    const exempt = USAGE_EXCEPTIONS.has(key);
    if (got < r.floor && !exempt) below.push(`${key}: ${got.toFixed(2)} < ${r.floor}`);
  }
  expect(below).toEqual([]);
});

test("G1: both themes define the same semantic names, and every one resolves", async () => {
  const semantic = blocks(await file(`${dir}/semantic.css`).text());
  const dark = Object.keys(semantic.get(":root,[data-theme=dark]") ?? {}).toSorted((a, b) =>
    a.localeCompare(b),
  );
  const linen = Object.keys(semantic.get("[data-theme=linen]") ?? {}).toSorted((a, b) =>
    a.localeCompare(b),
  );
  // Linen may omit a name (it inherits from :root) but may not invent one.
  expect(linen.filter((n) => !dark.includes(n))).toEqual([]);
  const env = await themes();
  for (const theme of ["dark", "linen"] as const) {
    for (const name of dark) expect(resolve(env[theme], `var(${name})`).length > 0).toBe(true);
  }
});

/** K1/K2: the check mark (--accent, --disabled when disabled) and every Colour swatch's outline. */
test("K1/K2: the mark and each swatch outline are at least 3:1 on --surface in both themes", async () => {
  const env = await themes();
  const strings = await file(`${import.meta.dir}/../../src/v2/app/strings.ts`).text();
  const block = /colours: \[([\s\S]*?)\]/.exec(strings)?.[1] ?? "";
  const swatches = [...block.matchAll(/colour: "var\((--path-[\w-]+)\)"/g)].map((m) => m[1] ?? "");
  expect(swatches.length).toBe(8);
  const below: string[] = [];
  for (const theme of ["dark", "linen"] as const) {
    const surface = resolve(env[theme], "var(--surface)");
    for (const fg of ["--accent", "--disabled", ...swatches]) {
      const got = ratio(resolve(env[theme], `var(${fg})`), surface);
      if (got < 3) below.push(`${theme} ${fg}: ${got.toFixed(2)}`);
    }
  }
  expect(below).toEqual([]);
});
