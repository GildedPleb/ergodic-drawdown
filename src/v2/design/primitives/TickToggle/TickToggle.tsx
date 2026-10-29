import type { JSX, KeyboardEvent } from "react";

import { CheckMark } from "../CheckMark";
import styles from "./TickToggle.module.css";

/** R7: variant keys and values. */
export const variants = {
  /** Absent = enabled / the full-width row; aria-checked carries on/off (K1: no look but the mark). */
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
   * §1MP: "row" is a tick row with the mark on the text column; "pair" is one compact toggle of a
   * pair (Clamp Min / Max), mark and word one 44px target with --s-2 side padding. K1: no fill.
   */
  size?: "row" | "pair";
};

/**
 * A native <button> fires click on every auto-repeated Enter keydown. A held key must toggle
 * once (FL-001), so repeats are cancelled. Space already activates once, on keyup.
 */
const blockRepeat = (event: KeyboardEvent<HTMLButtonElement>): void => {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
};

/** A switch: the K1 check mark in --accent (a core when on) and its --text words; no ON/OFF. */
export const TickToggle = ({
  label,
  name,
  checked,
  disabled = false,
  onChange,
  size = "row",
}: TickToggleProps): JSX.Element => {
  const root = styles["root"] ?? "tick-root";
  const body = styles["body"] ?? "tick-body";
  const mark = styles["mark"] ?? "tick-mark";
  return (
    <button
      type="button"
      className={root}
      role="switch"
      aria-checked={checked}
      aria-label={name}
      disabled={disabled}
      data-size={size === "pair" ? "pair" : undefined}
      data-disabled={disabled ? "true" : undefined}
      onKeyDown={blockRepeat}
      onClick={() => {
        if (!disabled) onChange?.(!checked);
      }}
    >
      <span className={body}>
        <span className={mark}>
          <CheckMark on={checked} disabled={disabled} />
        </span>
        <span>{label}</span>
      </span>
    </button>
  );
};
