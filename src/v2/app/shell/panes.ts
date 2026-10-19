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
