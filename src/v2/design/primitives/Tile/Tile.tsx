import type { JSX, MouseEvent, Ref } from "react";

import { Icon, type IconName } from "../Icon";
import styles from "./Tile.module.css";

/** R7: variant keys and values (T2: only soft is built; loud is queued). */
export const variants = {
  variant: ["soft"] as const,
};

export type TileProps = {
  /** T2: the look; "soft" is the floating word over its feather. */
  variant?: (typeof variants.variant)[number];
  /** The visible text. It never truncates. */
  label: string;
  /** Drawn before the label, always aria-hidden. */
  glyph?: IconName;
  onClick?: () => void;
  /** Native disabled: out of the tab order. */
  disabled?: boolean;
  /** Styled as disabled but still focusable; activation is ignored. */
  "aria-disabled"?: "true";
  /** Must start with the visible label (WCAG 2.5.3). */
  "aria-label"?: string;
  type?: "button" | "submit";
  ref?: Ref<HTMLButtonElement>;
};

/**
 * T2 Tile: one `<button>` at least --hit tall, square, sized by its content. Soft is the r3
 * floating word: italic --text-muted over a --surface feather, no box and no shadow. No state
 * changes the box, and nothing inside animates; any fade belongs to the parent that places it.
 */
export const Tile = ({
  variant = "soft",
  label,
  glyph,
  onClick,
  disabled,
  "aria-disabled": ariaDisabled,
  "aria-label": ariaLabel,
  type = "button",
  ref,
}: TileProps): JSX.Element => {
  const root = styles["root"] ?? "tile-root";
  const text = styles["label"] ?? "tile-label";
  const onPress = (event: MouseEvent<HTMLButtonElement>): void => {
    if (ariaDisabled === "true") {
      event.preventDefault();
      return;
    }
    onClick?.();
  };
  return (
    <button
      ref={ref}
      type={type}
      className={root}
      data-variant={variant}
      disabled={disabled}
      aria-disabled={ariaDisabled}
      aria-label={ariaLabel}
      onClick={onPress}
    >
      {glyph === undefined ? null : <Icon name={glyph} />}
      <span className={text}>{label}</span>
    </button>
  );
};
