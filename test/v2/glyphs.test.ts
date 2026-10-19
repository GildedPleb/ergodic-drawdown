import { file, Glob } from "bun";
import { expect, test } from "bun:test";

const fontsDir = `${import.meta.dir}/../../src/v2/design/fonts`;

type Face = {
  sha256: string;
  bytes: number;
  glyphs: Record<string, boolean>;
  tnum: boolean;
  lnum: boolean;
};

type Manifest = {
  requiredCodepoints: string[];
  faces: Record<string, Face>;
};

const isManifest = (value: unknown): value is Manifest => {
  if (typeof value !== "object" || value === null) return false;
  if (!("requiredCodepoints" in value) || !("faces" in value)) return false;
  return (
    Array.isArray(value.requiredCodepoints) &&
    typeof value.faces === "object" &&
    value.faces !== null
  );
};

const sha256Hex = async (buffer: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

test("glyph manifest lists U+20BF and U+2192 on every Form face", async () => {
  const parsed: unknown = JSON.parse(await file(`${fontsDir}/glyphs.json`).text());
  if (!isManifest(parsed)) throw new Error("bad glyphs.json");
  const manifest = parsed;
  expect(manifest.requiredCodepoints.includes("U+20BF")).toBe(true);
  expect(manifest.requiredCodepoints.includes("U+2192")).toBe(true);

  const expected = [
    "SMCormorant-500.woff2",
    "SMEBGaramond-400.woff2",
    "SMEBGaramond-400i.woff2",
    "SMJost-500.woff2",
    "SMJost-600.woff2",
  ];
  for (const name of expected) {
    const face = manifest.faces[name];
    expect(face === undefined).toBe(false);
    if (face === undefined) continue;
    expect(face.glyphs["U+20BF"]).toBe(true);
    expect(face.glyphs["U+2192"]).toBe(true);
    expect(face.tnum).toBe(true);
    const buffer = await file(`${fontsDir}/${name}`).arrayBuffer();
    expect(buffer.byteLength).toBe(face.bytes);
    expect(await sha256Hex(buffer)).toBe(face.sha256);
  }
  expect(manifest.faces["SMJost-500.woff2"]?.lnum).toBe(false);
});

test("experiment font sets are not shipped", () => {
  const names = [...new Glob("*").scanSync({ cwd: fontsDir })];
  for (const banned of ["cur", "s1", "s3", "r0", "r1"]) {
    expect(names.includes(banned)).toBe(false);
  }
});
