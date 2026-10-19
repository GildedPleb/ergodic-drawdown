/** Minimal WOFF2 reader for tests: decodes the brotli stream and reads cmap coverage + GSUB feature tags. */
import { brotliDecompressSync } from "node:zlib";

const KNOWN_TAGS = [
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "cvt ",
  "fpgm",
  "glyf",
  "loca",
  "prep",
  "CFF ",
  "VORG",
  "EBDT",
  "EBLC",
  "gasp",
  "hdmx",
  "kern",
  "LTSH",
  "PCLT",
  "VDMX",
  "vhea",
  "vmtx",
  "BASE",
  "GDEF",
  "GPOS",
  "GSUB",
  "EBSC",
  "JSTF",
  "MATH",
  "CBDT",
  "CBLC",
  "COLR",
  "CPAL",
  "SVG ",
  "sbix",
  "acnt",
  "avar",
  "bdat",
  "bloc",
  "bsln",
  "cvar",
  "fdsc",
  "feat",
  "fmtx",
  "fvar",
  "gvar",
  "hsty",
  "just",
  "lcar",
  "mort",
  "morx",
  "opbd",
  "prop",
  "trak",
  "Zapf",
  "Silf",
  "Glat",
  "Gloc",
  "Feat",
  "Sill",
];

export type Woff2Info = {
  codepoints: Set<number>;
  gsubFeatures: Set<string>;
  /** head.unitsPerEm and OS/2 sTypoAscender / sTypoDescender (font units). */
  vertical: { unitsPerEm: number; ascender: number; descender: number };
};

const tagAt = (view: DataView, offset: number): string =>
  String.fromCodePoint(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );

const readCmap = (view: DataView, base: number): Set<number> => {
  const out = new Set<number>();
  const count = view.getUint16(base + 2);
  let best = -1;
  let bestFormat = 0;
  for (let index = 0; index < count; index += 1) {
    const rec = base + 4 + index * 8;
    const platform = view.getUint16(rec);
    const encoding = view.getUint16(rec + 2);
    const sub = base + view.getUint32(rec + 4);
    const format = view.getUint16(sub);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    if (format === 12 || (format === 4 && bestFormat !== 12)) {
      best = sub;
      bestFormat = format;
    }
  }
  if (best < 0) throw new Error("no unicode cmap");
  if (bestFormat === 12) {
    const groups = view.getUint32(best + 12);
    for (let g = 0; g < groups; g += 1) {
      const rec = best + 16 + g * 12;
      const start = view.getUint32(rec);
      const end = view.getUint32(rec + 4);
      const glyph = view.getUint32(rec + 8);
      for (let c = start; c <= end; c += 1) if (glyph + (c - start) !== 0) out.add(c);
    }
    return out;
  }
  const segX2 = view.getUint16(best + 6);
  const ends = best + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  for (let s = 0; s < segX2; s += 2) {
    const end = view.getUint16(ends + s);
    const start = view.getUint16(starts + s);
    const delta = view.getInt16(deltas + s);
    const rangeOffset = view.getUint16(ranges + s);
    for (let c = start; c <= end && c !== 0xffff; c += 1) {
      let glyph: number;
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
      else {
        const at = ranges + s + rangeOffset + (c - start) * 2;
        glyph = view.getUint16(at);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) out.add(c);
    }
  }
  return out;
};

const readGsubFeatures = (view: DataView, base: number): Set<string> => {
  const list = base + view.getUint16(base + 6);
  const count = view.getUint16(list);
  const out = new Set<string>();
  for (let index = 0; index < count; index += 1) out.add(tagAt(view, list + 2 + index * 6));
  return out;
};

export const readWoff2 = (bytes: Uint8Array): Woff2Info => {
  const head = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (tagAt(head, 0) !== "wOF2") throw new Error("not WOFF2");
  const numTables = head.getUint16(12);
  let pos = 48;
  const base128 = (): number => {
    let value = 0;
    for (let index = 0; index < 5; index += 1) {
      const byte = head.getUint8(pos);
      pos += 1;
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
    throw new Error("bad UIntBase128");
  };
  const tables: { tag: string; offset: number; length: number }[] = [];
  let streamOffset = 0;
  for (let index = 0; index < numTables; index += 1) {
    const flags = head.getUint8(pos);
    pos += 1;
    let tag: string;
    if ((flags & 0x3f) === 0x3f) {
      tag = tagAt(head, pos);
      pos += 4;
    } else tag = KNOWN_TAGS[flags & 0x3f] ?? "????";
    const origLength = base128();
    const version = (flags >> 6) & 3;
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    const length = transformed ? base128() : origLength;
    tables.push({ tag, offset: streamOffset, length });
    streamOffset += length;
  }
  const compressedSize = head.getUint32(20);
  const stream = brotliDecompressSync(bytes.subarray(pos, pos + compressedSize));
  const view = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const cmap = tables.find((t) => t.tag === "cmap");
  if (cmap === undefined) throw new Error("no cmap table");
  const gsub = tables.find((t) => t.tag === "GSUB");
  const headTable = tables.find((t) => t.tag === "head");
  const os2 = tables.find((t) => t.tag === "OS/2");
  if (headTable === undefined || os2 === undefined) throw new Error("no head or OS/2 table");
  return {
    codepoints: readCmap(view, cmap.offset),
    gsubFeatures: gsub === undefined ? new Set() : readGsubFeatures(view, gsub.offset),
    vertical: {
      unitsPerEm: view.getUint16(headTable.offset + 18),
      ascender: view.getInt16(os2.offset + 68),
      descender: view.getInt16(os2.offset + 70),
    },
  };
};
