import type { JSX, KeyboardEvent } from "react";

import { Icon } from "../Icon";
import styles from "./TickToggle.module.css";

/** R7: variant keys and values. */
export const variants = {
  /** Absent = off / enabled / the full-width row. */
  state: ["on"] as const,
  disabled: ["true"] as const,
  size: ["pair"] as const,
};

export type TickToggleProps = {
  /** The visible word(s) after the box. */
  label: string;
  /** The switch's accessible name when it differs from the visible word ("Clamp minimum price"). */
  name?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  /**
   * §1MP: "row" is a tick-box row with the box on the text column and, when on, a --selected
   * fill from --tk-pad-x before the box to the scrollbar; "pair" is one compact toggle of a pair
   * (Clamp Min / Max), box and word one 44px target with --s-2 side padding.
   */
  /** "row": the full-width row (default); "pair": the compact Clamp pair. */
  size?: "row" | "pair";
};

/**
 * A native <button> fires click on every auto-repeated Enter keydown. A held key must toggle
 * once (FL-001), so repeats are cancelled. Space already activates once, on keyup.
 */
const blockRepeat = (event: KeyboardEvent<HTMLButtonElement>): void => {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
};

/** A switch: a 1rem tick box (filled --accent with a --ground ✓ when on) and its words; no ON/OFF. */
export const TickToggle = ({
  label,
  name,
  checked,
  disabled = false,
  onChange,
  size = "row",
}: TickToggleProps): JSX.Element => {
  const root = styles["root"] ?? "tick-root";
  const box = styles["box"] ?? "tick-box";
  const text = styles["label"] ?? "tick-label";
  return (
    <button
      type="button"
      className={root}
      role="switch"
      aria-checked={checked}
      aria-label={name}
      disabled={disabled}
      data-state={checked ? "on" : undefined}
      data-size={size === "pair" ? "pair" : undefined}
      data-disabled={disabled ? "true" : undefined}
      onKeyDown={blockRepeat}
      onClick={() => {
        if (!disabled) onChange?.(!checked);
      }}
    >
      <span className={box} aria-hidden="true">
        <Icon name="check" />
      </span>
      <span className={text}>{label}</span>
    </button>
  );
};
