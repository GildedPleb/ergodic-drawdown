/**
 * WAI-ARIA APG select-only combobox, keyboard model (pure, so the suite can walk it).
 * Closed: ↓ / Enter / Space open on the current value; ↑ and Home open on the first option, End on
 * the last; a printable key opens and type-aheads. Open: ↑ ↓ move (no wrap), Home / End jump,
 * PageUp / PageDown move 10, Enter / Space / Alt+↑ pick and close, Tab picks and closes (focus
 * moves on), Esc closes with no change. Type-ahead: keys within 500ms build a prefix; one key
 * pressed repeatedly cycles the options that start with it.
 */
export type SelectState = { open: boolean; active: number; typed: string; typedAt: number };

export type KeyInput = { key: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };

export type SelectStep = {
  state: SelectState;
  /** Index to commit as the new value (the caller compares it with the current value). */
  commit?: number;
  /** The key was ours: preventDefault. Tab is never prevented. */
  handled: boolean;
};

export const TYPEAHEAD_MS = 500;
const PAGE = 10;

export const closedState = (selected: number): SelectState => ({
  open: false,
  active: Math.max(0, selected),
  typed: "",
  typedAt: Number.NEGATIVE_INFINITY,
});

const clamp = (i: number, n: number): number => Math.min(n - 1, Math.max(0, i));

const printable = (k: KeyInput): boolean =>
  k.key.length === 1 && k.ctrlKey !== true && k.metaKey !== true && k.altKey !== true;

/** The option a type-ahead buffer lands on, or -1 for no match. */
const typeahead = (labels: readonly string[], from: number, buffer: string): number => {
  const n = labels.length;
  const want = buffer.toLowerCase();
  const chars = Array.from(want);
  const same = chars.every((c) => c === chars[0]);
  // A repeated single key cycles: start after the current option. A longer prefix may stay on it.
  const prefix = same ? (chars[0] ?? "") : want;
  const start = same ? from + 1 : from;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if ((labels[i] ?? "").toLowerCase().startsWith(prefix)) return i;
  }
  return -1;
};

export const selectKey = (
  s: SelectState,
  k: KeyInput,
  labels: readonly string[],
  selected: number,
  now: number,
): SelectStep => {
  const n = labels.length;
  if (n === 0) return { state: s, handled: false };
  const open = (active: number): SelectStep => ({
    state: { ...s, open: true, active: clamp(active, n) },
    handled: true,
  });
  const close = (commit?: number, handled = true): SelectStep =>
    commit === undefined
      ? { state: { ...closedState(selected) }, handled }
      : { state: { ...closedState(commit) }, commit, handled };

  if (printable(k) && !(k.key === " " && (s.typed === "" || now - s.typedAt > TYPEAHEAD_MS))) {
    const buffer = (now - s.typedAt > TYPEAHEAD_MS ? "" : s.typed) + k.key;
    const from = s.open ? s.active : Math.max(0, selected);
    const hit = typeahead(labels, from, buffer);
    return {
      state: { open: true, active: hit < 0 ? from : hit, typed: buffer, typedAt: now },
      handled: true,
    };
  }

  if (!s.open) {
    switch (k.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        return open(Math.max(0, selected));
      case "ArrowUp":
        return k.altKey === true ? open(Math.max(0, selected)) : open(0);
      case "Home":
        return open(0);
      case "End":
        return open(n - 1);
      default:
        return { state: s, handled: false };
    }
  }

  switch (k.key) {
    case "ArrowDown":
      return open(s.active + 1);
    case "ArrowUp":
      return k.altKey === true ? close(s.active) : open(s.active - 1);
    case "Home":
      return open(0);
    case "End":
      return open(n - 1);
    case "PageDown":
      return open(s.active + PAGE);
    case "PageUp":
      return open(s.active - PAGE);
    case "Enter":
    case " ":
      return close(s.active);
    case "Tab":
      return close(s.active, false);
    case "Escape":
      return close();
    default:
      return { state: s, handled: false };
  }
};

/**
 * V32-BUILD §1U: where the open list goes, in the viewport. `want` is every row plus the frame;
 * below if it fits there, else above if it fits there. If neither, the roomier side, with the
 * height cut to a whole number of rows (the list scrolls, snapping on rows). Never under one row.
 */
export const placeList = (
  below: number,
  above: number,
  rowHeight: number,
  count: number,
  frame = 0,
): { up: boolean; maxHeight: number } => {
  const want = count * rowHeight + frame;
  if (below >= want) return { up: false, maxHeight: want };
  if (above >= want) return { up: true, maxHeight: want };
  const up = above > below;
  const rows = Math.max(1, Math.floor(((up ? above : below) - frame) / rowHeight));
  return { up, maxHeight: rows * rowHeight + frame };
};

type FieldBox = { top: number; bottom: number; left: number; width: number };

/** §1U: the list's viewport box from its field's: flush below or above, as wide as the field. */
export const listPlace = (
  field: FieldBox,
  viewHeight: number,
  rowHeight: number,
  count: number,
  frame: number,
): { up: boolean; maxHeight: number; x: number; y: number; w: number } => {
  const p = placeList(viewHeight - field.bottom, field.top, rowHeight, count, frame);
  return {
    ...p,
    x: field.left,
    y: p.up ? field.top - p.maxHeight : field.bottom,
    w: field.width,
  };
};

/**
 * §1U, while the list is open: a wheel or touch-move outside it is stopped (the sheet's scroll is
 * locked) and closes it; any scroll outside it or a resize closes it. Returns the detach.
 */
export const lockWhileOpen = (
  doc: EventTarget,
  win: EventTarget,
  inside: (target: EventTarget | null) => boolean,
  close: () => void,
): (() => void) => {
  const lock = (event: Event): void => {
    if (inside(event.target)) return;
    event.preventDefault();
    close();
  };
  const onScroll = (event: Event): void => {
    if (!inside(event.target)) close();
  };
  const opts = { passive: false, capture: true };
  doc.addEventListener("wheel", lock, opts);
  doc.addEventListener("touchmove", lock, opts);
  doc.addEventListener("scroll", onScroll, true);
  win.addEventListener("resize", close);
  return () => {
    doc.removeEventListener("wheel", lock, opts);
    doc.removeEventListener("touchmove", lock, opts);
    doc.removeEventListener("scroll", onScroll, true);
    win.removeEventListener("resize", close);
  };
};
