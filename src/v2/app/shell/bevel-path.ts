/**
 * V32-BUILD §1X: the sheet's bevelled edge as SVG paths, not a border plus a clip. The straight
 * run is stroked at the rule width, each diagonal at --bevel-comp (an antialiased 45° line reads
 * lighter than a straight one of the same width). Every stroke sits just inside the sheet's clip
 * polygon, so none of it is cut off. Coordinates are CSS px in the sheet's own box.
 */
export type BevelPaths = { run: string; diagonals: string };

const n = (v: number): string => String(Math.round(v * 100) / 100);

/**
 * `length` is the bevelled edge's length (the sheet's width; the panel's height), `ch` the chamfer,
 * `rule` and `comp` the two stroke widths. `side` draws the panel's left edge (x and y swapped).
 */
export const bevelPaths = (
  length: number,
  ch: number,
  rule: number,
  comp: number,
  side: boolean,
): BevelPaths | null => {
  if (!(length > 2 * ch) || !(ch > 0)) return null;
  const s = rule / 2;
  // The diagonal x + y = ch, moved inward by half its own stroke.
  const c = ch + (comp / 2) * Math.SQRT2;
  const at = (along: number, across: number): string =>
    side ? `${n(across)} ${n(along)}` : `${n(along)} ${n(across)}`;
  const runFrom = c - s; // where the diagonal meets the run's centre line
  const run = `M${at(0, c)}L${at(runFrom, s)}L${at(length - runFrom, s)}L${at(length, c)}`;
  const diagonals = `M${at(0, c)}L${at(runFrom, s)}M${at(length - runFrom, s)}L${at(length, c)}`;
  return { run, diagonals };
};

/** A CSS length in px from a computed custom property ("16px", "1.4px"); 0 when unreadable. */
export const px = (value: string): number => {
  const v = Number.parseFloat(value);
  return Number.isFinite(v) ? v : 0;
};

/**
 * The bevel for a measured sheet: its box, its --sheet-ch as written ("1rem" or px), the root font
 * size, and the two computed stroke widths (run, diagonal).
 */
export const bevelFor = (
  box: { offsetWidth: number; offsetHeight: number },
  sheetCh: string,
  rootFont: string,
  strokes: readonly number[],
  side: boolean,
): BevelPaths | null => {
  const ch = px(sheetCh) * (sheetCh.includes("rem") ? px(rootFont) : 1);
  const [run = 1, diag = 1] = strokes;
  return bevelPaths(side ? box.offsetHeight : box.offsetWidth, ch, run, diag, side);
};

type Styles = { getPropertyValue: (name: string) => string; strokeWidth: string; fontSize: string };
type Box = { offsetWidth: number; offsetHeight: number };
export type BevelEnv<E> = {
  /** getComputedStyle. */
  style: (el: E) => Styles;
  /** <html>, for the root font size. */
  root: E;
  /** ResizeObserver, when the page has one. */
  observe?: ((box: E, fn: () => void) => () => void) | undefined;
};
type BevelSvg<E> = E & {
  parentElement: (E & Box) | null;
  querySelectorAll: (sel: "path") => Iterable<E>;
};

/** Measures the bevel now and on every resize of its sheet; returns the stop. */
export const watchBevel = <E>(
  svg: BevelSvg<E> | null,
  side: boolean,
  set: (paths: BevelPaths | null) => void,
  env: BevelEnv<E>,
): (() => void) => {
  const box = svg?.parentElement ?? null;
  if (svg === null || box === null) return () => undefined;
  const { style } = env;
  const measure = (): void => {
    const strokes = [...svg.querySelectorAll("path")].map((p) => px(style(p).strokeWidth));
    const ch = style(svg).getPropertyValue("--sheet-ch");
    set(bevelFor(box, ch, style(env.root).fontSize, strokes, side));
  };
  measure();
  return env.observe?.(box, measure) ?? (() => undefined);
};

type Observer<E> = new (fn: () => void) => { observe: (box: E) => void; disconnect: () => void };

/** BevelEnv.observe from the page's ResizeObserver (none on the server). */
export const observeWith = <E>(RO: Observer<E> | undefined): BevelEnv<E>["observe"] =>
  RO === undefined
    ? undefined
    : (box, fn) => {
        const observer = new RO(fn);
        observer.observe(box);
        return () => {
          observer.disconnect();
        };
      };
