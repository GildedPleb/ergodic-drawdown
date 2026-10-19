import type { JSX, KeyboardEvent } from "react";

import { Icon } from "../Icon";
import styles from "./TickToggle.module.css";

/** R7: variant keys and values. */
export const variants = {
  state: ["on", "off"] as const,
  disabled: ["true", "false"] as const,
};

export type TickToggleProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
};

/**
 * A native <button> fires click on every auto-repeated Enter keydown. A held key must toggle
 * once (FL-001), so repeats are cancelled. Space already activates once, on keyup.
 */
const blockRepeat = (event: KeyboardEvent<HTMLButtonElement>): void => {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
};

/** Tick-box + ON/OFF. 14px side pad (floor 12). Focus offset tight (0). ✓ via Icon SVG. */
export const TickToggle = ({
  label,
  checked,
  disabled = false,
  onChange,
}: TickToggleProps): JSX.Element => {
  const root = styles["root"] ?? "tick-root";
  const box = styles["box"] ?? "tick-box";
  const check = styles["check"] ?? "tick-check";
  const labelCls = styles["label"] ?? "tick-label";
  const state: (typeof variants.state)[number] = checked ? "on" : "off";
  return (
    <button
      type="button"
      className={root}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-state={state}
      data-disabled={disabled ? "true" : "false"}
      onKeyDown={blockRepeat}
      onClick={() => {
        if (!disabled) onChange?.(!checked);
      }}
    >
      <span className={box} aria-hidden="true">
        <span className={check}>
          <Icon name="check" />
        </span>
      </span>
      {/* m3: the state is aria-checked; the ON/OFF word is visual only. */}
      <span className={labelCls} aria-hidden="true">
        {checked ? "ON" : "OFF"}
      </span>
      <span className={labelCls}>{label}</span>
    </button>
  );
};
