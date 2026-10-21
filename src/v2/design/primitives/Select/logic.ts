/**
 * V32-BUILD §1MP item 6/13, the in-place selector's keys while its list is open (pure, so the
 * suite can walk it): ↑ ↓ move one row (no wrap), Home / End jump to the first and last rows,
 * Esc closes with no change. Enter / Space are the row button's own click (pick and close).
 * Closed, the pick is a plain button: Enter / Space open the list.
 */
export type ListStep = { open: boolean; active: number; handled: boolean };

export const listKey = (open: boolean, active: number, count: number, key: string): ListStep => {
  const at = (i: number): ListStep => ({
    open: true,
    active: Math.min(count - 1, Math.max(0, i)),
    handled: true,
  });
  if (!open || count === 0) return { open, active, handled: false };
  switch (key) {
    case "ArrowDown":
      return at(active + 1);
    case "ArrowUp":
      return at(active - 1);
    case "Home":
      return at(0);
    case "End":
      return at(count - 1);
    case "Escape":
      return { open: false, active, handled: true };
    default:
      return { open, active, handled: false };
  }
};
