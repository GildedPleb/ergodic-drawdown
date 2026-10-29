import type { JSX } from "react";

import styles from "./CheckMark.module.css";

/** R7: variant keys and values. */
export const variants = {
  /** Absent = off / default size / enabled. */
  state: ["on"] as const,
  size: ["large"] as const,
  disabled: ["true"] as const,
};

export type CheckMarkProps = {
  on: boolean;
  /** "default": the 0.6875rem key and tick mark; "large": the 1.25rem colour chip (K2). */
  size?: "default" | "large";
  /** M4: dashed outline; the core still shows when on. */
  disabled?: boolean;
};

/**
 * V32-BUILD K1/K2: the one check mark (AssetRow key, TickToggle, Swatches). aria-hidden and
 * drawn in currentColor; the parent owns the role, the name, the colour and the 44px target, and
 * hangs its colour and focus ring on a wrapper of its own (geometry stays here).
 */
export const CheckMark = ({
  on,
  size = "default",
  disabled = false,
}: CheckMarkProps): JSX.Element => {
  const root = styles["root"] ?? "check-mark-root";
  return (
    <span
      className={root}
      aria-hidden="true"
      data-state={on ? "on" : undefined}
      data-size={size === "large" ? "large" : undefined}
      data-disabled={disabled ? "true" : undefined}
    />
  );
};
