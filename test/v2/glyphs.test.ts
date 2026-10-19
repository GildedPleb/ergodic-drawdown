import { file } from "bun";
import { expect, test } from "bun:test";

import { readWoff2 } from "./support/woff2";

const fontsDir = `${import.meta.dir}/../../src/v2/design/fonts`;

const FACES = [
  "SMCormorant-500.woff2",
  "SMEBGaramond-400.woff2",
  "SMEBGaramond-400i.woff2",
  "SMJost-500.woff2",
  "SMJost-600.woff2",
] as const;

// MVP-SPEC G2: Basic Latin + these, read from the shipped WOFF2 cmap (not from a manifest boolean).
const REQUIRED = [0x20bf, 0x2192, 0x2212, 0x2013, 0x2019, 0x2026, 0x00b7, 0x00d7, 0x202f, 0x2014];

type Face = { sha256: string; bytes: number; tnum: boolean; lnum: boolean };
type Manifest = { faces: Record<string, Face>; totalBytes: number; preloadBytes: number };

const isManifest = (value: unknown): value is Manifest =>
  typeof value === "object" && value !== null && "faces" in value && "totalBytes" in value;

const sha256Hex = async (buffer: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const loadManifest = async (): Promise<Manifest> => {
  const parsed: unknown = JSON.parse(await file(`${fontsDir}/manifest.json`).text());
  if (!isManifest(parsed)) throw new Error("bad manifest.json");
  return parsed;
};

test("every shipped face maps Basic Latin + the G2 set and keeps tnum (read from the WOFF2 cmap/GSUB)", async () => {
  const manifest = await loadManifest();
  for (const name of FACES) {
    const buffer = await file(`${fontsDir}/${name}`).arrayBuffer();
    const info = readWoff2(new Uint8Array(buffer));
    for (let c = 0x20; c <= 0x7e; c += 1) expect(info.codepoints.has(c)).toBe(true);
    for (const c of REQUIRED) {
      if (!info.codepoints.has(c)) throw new Error(`${name} lacks U+${c.toString(16)}`);
    }
    expect(info.gsubFeatures.has("tnum")).toBe(true);
    const face = manifest.faces[name];
    if (face === undefined) throw new Error(`manifest lacks ${name}`);
    expect(face.tnum).toBe(info.gsubFeatures.has("tnum"));
    expect(face.lnum).toBe(info.gsubFeatures.has("lnum"));
    expect(buffer.byteLength).toBe(face.bytes);
    expect(await sha256Hex(buffer)).toBe(face.sha256);
  }
  // Jost ships no lnum feature (its figures are lining by default).
  expect(manifest.faces["SMJost-500.woff2"]?.lnum).toBe(false);
});

test("fonts are subset: G8 budgets (≤90 KB preload, ≤150 KB all faces)", async () => {
  const manifest = await loadManifest();
  let total = 0;
  for (const name of FACES) total += (await file(`${fontsDir}/${name}`).arrayBuffer()).byteLength;
  expect(total).toBe(manifest.totalBytes);
  expect(total).toBeLessThanOrEqual(150_000);
  expect(manifest.preloadBytes).toBeLessThanOrEqual(90_000);
});

test("optical-offset tokens are the shipped faces' (typoAscender − |typoDescender|) / 2 / upm", async () => {
  const css = await file(`${import.meta.dir}/../../src/v2/design/tokens/type.css`).text();
  const token = (name: string): number =>
    Number(new RegExp(`--optical-offset-${name}:\\s*([\\d.]+)`).exec(css)?.[1]);
  for (const [name, face] of [
    ["jost", "SMJost-500.woff2"],
    ["garamond", "SMEBGaramond-400.woff2"],
  ] as const) {
    const bytes = new Uint8Array(await file(`${fontsDir}/${face}`).arrayBuffer());
    const { unitsPerEm, ascender, descender } = readWoff2(bytes).vertical;
    expect(token(name)).toBe((ascender + descender) / 2 / unitsPerEm);
  }
});
