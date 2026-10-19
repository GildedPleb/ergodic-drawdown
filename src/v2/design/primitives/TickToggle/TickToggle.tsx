import type { JSX } from "react";

import { Icon } from "../Icon";
import styles from "./TickToggle.module.css";

export type TickToggleProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
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
  return (
    <button
      type="button"
      className={root}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-state={checked ? "on" : "off"}
      data-disabled={disabled ? "true" : "false"}
      onClick={() => {
        if (!disabled) onChange?.(!checked);
      }}
    >
      <span className={box} aria-hidden="true">
        <span className={check}>
          <Icon name="check" />
        </span>
      </span>
      <span className={labelCls}>{checked ? "ON" : "OFF"}</span>
      <span className={labelCls}>{label}</span>
    </button>
  );
};
