import type { JSX, MouseEvent, Ref } from "react";

import { Icon, type IconName } from "../Icon";
import styles from "./Tile.module.css";

/** R7: variant keys and values (T2: soft is the floating word, loud the plaque). */
export const variants = {
  variant: ["soft", "loud"] as const,
};

export type TileProps = {
  /** T2: "soft" is the floating word over its feather; "loud" is the bevelled plaque. */
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

/** Loud's plate: hairline, face and inner rule, clipped to parallel octagons under one lifted wrapper. */
const Plate = (): JSX.Element => (
  <span className={styles["plate"] ?? "tile-plate"} aria-hidden="true">
    <span className={styles["line"] ?? "tile-line"} />
    <span className={styles["face"] ?? "tile-face"} />
    <span className={styles["rule"] ?? "tile-rule"} />
  </span>
);

/**
 * T2 focus ring, one piece for every variant: a frame placed exactly like the plate, holding a
 * --focus-w octagon ring that is a parallel offset of the plate's bevel, --_fo out. It shows on
 * :focus-visible and never changes the box. The variant supplies --_h, --_ch and --_fo.
 */
const FocusRing = (): JSX.Element => (
  <span className={styles["focus"] ?? "tile-focus"} aria-hidden="true">
    <span className={styles["ring"] ?? "tile-ring"} />
  </span>
);

/**
 * T2 Tile: one `<button>` at least --hit tall, square, sized by its content. Soft is the r3
 * floating word: italic --text-muted over a --surface feather, no box and no shadow. Loud is the
 * r3 plaque: a chamfered octagon with a hairline, an inner rule and the --shadow-tile lift. No
 * state changes the box, and nothing inside animates; any fade belongs to the parent that places it.
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
  const mark = styles["glyph"] ?? "tile-glyph";
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
      {variant === "loud" ? <Plate /> : null}
      {variant === "loud" ? <FocusRing /> : null}
      {glyph === undefined ? null : (
        <span className={mark}>
          <Icon name={glyph} />
        </span>
      )}
      <span className={text}>{label}</span>
    </button>
  );
};
