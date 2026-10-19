# StackMath P3 · v38 inner style (LOCKED)

This builds on v33/STYLE.md. The type scale, roles, tab order (Models → Plans → Stats), ⚙ Settings and the frame are unchanged; v38 replaces the control language.

## Locked control language: "Certificate"
- **Section and group labels:** every one is centred, including Price model, How prices move, Spending, Paid in bitcoin and table headers like Quantiles. Each is Inter 600 caps, tracked, in gold, set between two fine hairlines. The hairlines are thickest at the label, taper to a point and fade to nothing outward. Group labels use a lighter hairline (45%) than section labels (70%). There is no other ornament.
- **Boxes:** clean 3px double rules with square, complete corners. There is no overshoot, no crossing lines, no cuts, steps or rounding.
- **Compare against (segmented control):** a double-ruled box with 1px rules between options. The selected option gets a small gold ■, a 600 weight and a chip tint. That's three cues, so it never relies on colour alone.
- **Toggle:** a 16px tick-box with ON or OFF in Jost caps (v40) beside it. Off is an empty double-ruled square with muted text. On is a solid gold square with a ✓ and gold text.
  - **v41 row padding:** the whole row is the target (min 44px) with **14px inline padding each side (`--tk-pad-x`, floor 12px)**. The selected row gets `--selected` fill and the focus frame (2px `--focus`, offset 0) sits on the row edge, so the box and ON/OFF always sit 14px inside it, never touching the frame. Gap box→label 12px (`--tk-gap`).
- **Radio list:** 9px squares, filled when selected.
- **Plan items:** ledger rows with a 2px data-colour bar on the left and a hairline below. No card fill and no box.
- **Edited item:** a clean 3px double gold rule around the row, with a chip fill. The slider and caption sit inside it.
- **Slider:** a 1px hairline track, a 2px gold fill and a thin 4×16px square gold bar as the thumb, with a 2px surface halo. A muted tick marks the previous value.
- **Undo chip and active ⚙:** both square. The chip has a double gold rule; the active ⚙ has a 1px gold inset.
- **Focus:** a 2px `--focus` outline offset by 3–5px, square, on every control. On the slider thumb it's a square ring.
- **Rejected, do not reintroduce:** hexagonal toggles, diamond thumbs, cut or stepped corners, ziggurats, overshooting or crossed frames, lozenge ornaments, rounded pills.

## Rationale
The double rule comes from engraved certificates and ledgers: money, permanence, quiet. The centred hairlines that fade outward carry the Deco symmetry without ornament. The only Deco shape left is the locked fan-diamond logo, so it stays special. Every state changes shape (fill, ✓, ■, weight) as well as colour, and contrast is AA on both palettes.

## v41 tokens (rem) — `system/space.css`
Spacing: `--s-0` 2 · `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 14 · `--s-5` 16 · `--s-6` 24 · `--s-7` 32 · `--s-8` 48 (px at 100%, stored as rem). `--hit` 44.
Tick-box row: `--tk-h` 44 · `--tk-pad-x` 14 · `--tk-gap` 12 · `--tk-box` 16 · `--tk-sel-bg` var(--selected) · `--focus-w` 2px · `--focus-off` 0.
Others: `--seg-pad` 12/14 · `--row-pad` 9/12 · `--card-pad` 12/14 · `--thumb-w` 5px · `--thumb-h` 18.
Type sizes are rem in `type/type.css`. Hairlines and rules stay px. Superseded here: Inter (→ Jost/EB), 4×16 thumb (→ 5×18).
