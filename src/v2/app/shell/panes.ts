/** The sheet's three panes, left to right on desktop (V32-BUILD §1L.2). */
const PANES = ["models", "plans", "stats"] as const;
export type Pane = (typeof PANES)[number];

type Found = { getAttribute: (name: string) => string | null } | null;

const isPane = (v: string | null | undefined): v is Pane =>
  v !== null && v !== undefined && (PANES as readonly string[]).includes(v);

/**
 * The active pane is the one last clicked, tapped or tabbed into: the pane around the event
 * target, or the current one when the target is outside every pane.
 */
export const paneOf = (target: { closest: (sel: string) => Found } | null, current: Pane): Pane => {
  const v = target?.closest("[data-pane]")?.getAttribute("data-pane");
  return isPane(v) ? v : current;
};

type Boxed = { getClientRects: () => { length: number } };

/**
 * Where Esc puts focus once the sheet closes (§1i, Probe m9): the Models tab where it's rendered,
 * else (phone portrait, the dock row is display:none) the grab button.
 */
export const returnFocus = <T extends Boxed>(tab: T | null, grab: T | null): T | null =>
  tab !== null && tab.getClientRects().length > 0 ? tab : grab;

/**
 * The dock's layout: the closed landscape panel is a rail; desktop dock mode heads the sheet's
 * three columns (§1S); a phone and the open panel show one pane, so the tabs stay grouped.
 */
export const dockLayout = (
  side: boolean,
  shut: boolean,
  wide: boolean,
): "row" | "rail" | "columns" => {
  if (side) return shut ? "rail" : "row";
  return wide ? "columns" : "row";
};

type Keyed = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

/**
 * U1: Cmd/Ctrl+Z undoes and Shift+Cmd/Ctrl+Z redoes (keyboard only), except while focus is in a
 * text field, where the field keeps its own undo.
 */
export const undoKeyOf = (
  event: Keyed,
  focus: { closest: (sel: string) => unknown } | null,
): "undo" | "redo" | null => {
  if (event.key.toLowerCase() !== "z" || event.altKey || !(event.metaKey || event.ctrlKey))
    return null;
  if (focus?.closest('input, textarea, [contenteditable="true"]') != null) return null;
  return event.shiftKey ? "redo" : "undo";
};
