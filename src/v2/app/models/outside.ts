/**
 * §1V: while a ledger row is open, a press that `closes` (in the sheet, outside the ledger)
 * closes it. A document listener (G4); returns the detach.
 */
export const closeOnPress = (
  doc: EventTarget,
  closes: (target: EventTarget | null) => boolean,
  close: () => void,
): (() => void) => {
  const onDown = (event: Event): void => {
    if (closes(event.target)) close();
  };
  doc.addEventListener("pointerdown", onDown);
  return () => {
    doc.removeEventListener("pointerdown", onDown);
  };
};
