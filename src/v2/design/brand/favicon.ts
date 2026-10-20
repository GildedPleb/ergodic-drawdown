/**
 * The favicon (Form, §1L): the fan-diamond, rotated so the fan opens to the RIGHT like the chart,
 * on the page ground. It retires the SM monogram. One SVG per raster size, pixel-snapped: at 32px
 * (and up) the full seven-line fan; at 16px a heavier stroke and just the fan's two outer lines
 * (a chevron opening right from the left point), so it reads as a fan rather than a grey wash. `scripts/v2/favicon.ts` rasterises these into the
 * public/favicon-16x16.png, favicon-32x32.png and favicon.ico files (G13 allows those paths only).
 */
export type FaviconInk = { ground: string; surface: string; accent: string };

type Pt = readonly [number, number];

/** Fan geometry in a box of side `s` with inset `m`: the left point and the fan's end points. */
export const fanOf = (
  s: number,
  m: number,
  lines: 3 | 7,
): { origin: Pt; ends: Pt[]; diamond: Pt[] } => {
  const c = s / 2;
  const r = c - m;
  const left: Pt = [c - r, c];
  const top: Pt = [c, c - r];
  const right: Pt = [c + r, c];
  const bottom: Pt = [c, c + r];
  // Points along the two right-hand edges (top → right and right → bottom), plus the right point.
  const ts = lines === 7 ? [0.25, 0.5, 0.75] : [0.5];
  const ends: Pt[] = [right];
  for (const t of ts) {
    ends.push([top[0] + r * t, top[1] + r * t], [bottom[0] + r * t, bottom[1] - r * t]);
  }
  return { origin: left, ends, diamond: [top, right, bottom, left] };
};

const n = (v: number): string => String(Math.round(v * 100) / 100);

/** The SVG for one raster size. 16px gets the heavier stroke and the two outer fan lines. */
export const faviconSvg = (size: 16 | 32, ink: FaviconInk): string => {
  const small = size === 16;
  const outline = small ? 1.5 : 1.75;
  const fanW = small ? 1.25 : 1;
  const fan = fanOf(size, small ? 1.5 : 2, small ? 3 : 7);
  const { origin, diamond } = fan;
  // 16px: the centre line would fill the chevron in, so only the two outer lines stay.
  const ends = small ? fan.ends.slice(1) : fan.ends;
  const d = `M${diamond.map(([x, y]) => `${n(x)} ${n(y)}`).join(" L")} Z`;
  const fans = ends
    .map(
      ([x, y]) =>
        `<line x1="${n(origin[0])}" y1="${n(origin[1])}" x2="${n(x)}" y2="${n(y)}" stroke="${ink.accent}" stroke-width="${n(fanW)}" stroke-linecap="round"/>`,
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" fill="${ink.ground}"/>` +
    `<path d="${d}" fill="${ink.surface}" stroke="${ink.accent}" stroke-width="${n(outline)}" stroke-linejoin="miter"/>` +
    `${fans}</svg>`
  );
};
