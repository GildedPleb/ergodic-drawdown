/**
 * Rasterise the v2 favicon (src/v2/design/brand/favicon.ts) into public/favicon-16x16.png,
 * public/favicon-32x32.png and public/favicon.ico (16, 32 and 48 px PNG entries), in the dark
 * palette's ground / surface / accent read from palette.css + semantic.css. Run on purpose:
 * `bun scripts/v2/favicon.ts`. The manifest icons and apple-touch-icon are left alone (PWA work).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

import { faviconSvg, type FaviconInk } from "../../src/v2/design/brand/favicon";
import { REPO, V2 } from "./css/tree";

const palette = readFileSync(join(V2, "design/tokens/palette.css"), "utf8");
const semantic = readFileSync(join(V2, "design/tokens/semantic.css"), "utf8");
/** The first (dark) definition of a semantic token, resolved through the palette. */
const hex = (token: string): string => {
  const ref = new RegExp(`--${token}:\\s*var\\(--([\\w-]+)\\)`).exec(semantic)?.[1];
  const value =
    ref === undefined
      ? undefined
      : new RegExp(`--${ref}:\\s*(#[0-9a-f]{6})`, "i").exec(palette)?.[1];
  if (value === undefined) throw new Error(`no hex for --${token}`);
  return value;
};
const ink: FaviconInk = { ground: hex("ground"), surface: hex("surface"), accent: hex("accent") };

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const shoot = async (svg: string, px: number): Promise<Buffer> => {
  await page.setViewportSize({ width: px, height: px });
  const html = `<html><body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" width="${String(px)}" height="${String(px)}" style="display:block"></body></html>`;
  await page.setContent(html);
  return page.screenshot({ clip: { x: 0, y: 0, width: px, height: px }, omitBackground: true });
};
const p16 = await shoot(faviconSvg(16, ink), 16);
const p32 = await shoot(faviconSvg(32, ink), 32);
const p48 = await shoot(faviconSvg(32, ink), 48);
await browser.close();

/** An ICO holding PNG entries (Vista+ format; every current browser reads it). */
const ico = (entries: Array<[number, Buffer]>): Buffer => {
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach(([px, png], i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(px >= 256 ? 0 : px, at);
    head.writeUInt8(px >= 256 ? 0 : px, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...entries.map(([, png]) => png)]);
};

writeFileSync(join(REPO, "public/favicon-16x16.png"), p16);
writeFileSync(join(REPO, "public/favicon-32x32.png"), p32);
writeFileSync(
  join(REPO, "public/favicon.ico"),
  ico([
    [16, p16],
    [32, p32],
    [48, p48],
  ]),
);
console.log("wrote public/favicon-16x16.png, favicon-32x32.png, favicon.ico");
