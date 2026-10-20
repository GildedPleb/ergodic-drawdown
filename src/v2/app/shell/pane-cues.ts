/**
 * V32-BUILD §1Y: a dock pane's scroll cues. ▲ on the top rule once the zone is scrolled, ▼ on the
 * foot rule while more is below, and whether the open asset's header is stuck (its hairline).
 * Scroll-driven animation draws the cues where supported; these flags are the fallback (and
 * reduced motion), written as data-attributes (no re-render): data-top / data-more on the pane,
 * data-stuck on the open row.
 */
type Cues = { top: boolean; more: boolean; stuck: boolean };

type Flagged = { dataset: Record<string, string | undefined> };
type Row = Flagged & { getBoundingClientRect: () => { top: number } };
export type Zone<E> = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  firstElementChild: E | null;
  getBoundingClientRect: () => { top: number };
  querySelector: (sel: string) => Row | null;
  querySelectorAll: (sel: string) => Iterable<Flagged>;
  addEventListener: (type: "scroll", fn: () => void, opts: { passive: true }) => void;
  removeEventListener: (type: "scroll", fn: () => void) => void;
};
export type Observe<E> = (els: E[], fn: () => void) => () => void;

/** A sub-pixel remainder at the foot is not "more below". */
const SLACK = 1;
const OPEN = '[data-state="open"]';

export const cuesOf = <E>(zone: Zone<E>): Cues => {
  const row = zone.querySelector(OPEN);
  return {
    top: zone.scrollTop > 0,
    more: zone.scrollHeight - zone.clientHeight - zone.scrollTop > SLACK,
    stuck: row !== null && row.getBoundingClientRect().top < zone.getBoundingClientRect().top - 0.5,
  };
};

export const paintCues = <E>(pane: Flagged, zone: Zone<E>): Cues => {
  const c = cuesOf(zone);
  pane.dataset["top"] = String(c.top);
  pane.dataset["more"] = String(c.more);
  for (const el of zone.querySelectorAll("[data-stuck]")) delete el.dataset["stuck"];
  const row = zone.querySelector(OPEN);
  if (c.stuck && row !== null) row.dataset["stuck"] = "true";
  return c;
};

/** Paints now, on every scroll, and whenever the zone or its content resizes. Returns the detach. */
export const watchCues = <E>(
  zone: (Zone<E> & E) | null,
  pane: Flagged | null,
  observe?: Observe<E>,
): (() => void) => {
  if (zone === null || pane === null) return () => undefined;
  const paint = (): void => {
    paintCues(pane, zone);
  };
  paint();
  zone.addEventListener("scroll", paint, { passive: true });
  const els: E[] = [zone];
  if (zone.firstElementChild !== null) els.push(zone.firstElementChild);
  const unobserve = observe?.(els, paint);
  return () => {
    zone.removeEventListener("scroll", paint);
    unobserve?.();
  };
};

type RO<E> = new (fn: () => void) => { observe: (el: E) => void; disconnect: () => void };

export const resizeWith = <E>(Ctor: RO<E> | undefined): Observe<E> | undefined =>
  Ctor === undefined
    ? undefined
    : (els, fn) => {
        const observer = new Ctor(fn);
        for (const el of els) observer.observe(el);
        return () => {
          observer.disconnect();
        };
      };
