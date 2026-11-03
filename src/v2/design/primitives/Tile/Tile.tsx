import type { JSX, MouseEvent, Ref } from "react";

import { hex } from "../../tokens/tokens";
import { Icon, type IconName } from "../Icon";
import styles from "./Tile.module.css";

/** R7: variant keys and values (T2: soft is the floating word, loud the plaque). */
export const variants = {
  variant: ["soft", "loud"] as const,
};

export type TileProps = {
  /** T2: "soft" is the floating word over its halo; "loud" is the bevelled plaque. */
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
const Plate = (): JSX.Element => {
  const plate = styles["plate"] ?? "tile-plate";
  const line = styles["line"] ?? "tile-line";
  const face = styles["face"] ?? "tile-face";
  const rule = styles["rule"] ?? "tile-rule";
  return (
    <span className={plate} aria-hidden="true">
      <span className={line} />
      <span className={face} />
      <span className={rule} />
    </span>
  );
};

/**
 * T2 focus ring, one piece for every variant: a frame placed exactly like the plate, holding a
 * --focus-w octagon ring that is a parallel offset of the plate's bevel, --_fo out. It shows on
 * :focus-visible and never changes the box. The variant supplies --_h, --_ch and --_fo.
 */
const FocusRing = (): JSX.Element => {
  const focus = styles["focus"] ?? "tile-focus";
  const ring = styles["ring"] ?? "tile-ring";
  return (
    <span className={focus} aria-hidden="true">
      <span className={ring} />
    </span>
  );
};

/** Each theme's literal --surface (semantic.css: --ink-900 in dark, --linen-150 in linen). */
const SURFACE = { dark: hex["ink-900"], linen: hex["linen-150"] } as const;

/** One theme's copy of the r42 3px halo filter, flooded with that theme's literal --surface. */
const HaloFilter = ({ theme }: { theme: keyof typeof SURFACE }): JSX.Element => (
  <filter
    id={`tile-halo-${theme}`}
    x="-50%"
    y="-100%"
    width="200%"
    height="300%"
    colorInterpolationFilters="sRGB"
  >
    <feComponentTransfer in="SourceAlpha" result="a">
      <feFuncA type="linear" slope="20" />
    </feComponentTransfer>
    <feMorphology in="a" operator="dilate" radius="3" result="solid" />
    <feMorphology in="a" operator="dilate" radius="7" result="big" />
    <feGaussianBlur in="big" stdDeviation="2" result="fade" />
    <feMerge result="m">
      <feMergeNode in="fade" />
      <feMergeNode in="solid" />
    </feMerge>
    <feFlood floodColor={SURFACE[theme]} />
    <feComposite in2="m" operator="in" result="halo" />
    <feMerge>
      <feMergeNode in="halo" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

/**
 * T2 soft halo (V32 r42, 3px; ADR-002 D2 amended 2026-11-03): the SVG filters behind
 * --shadow-tile-soft, one per theme (#tile-halo-dark, #tile-halo-linen). A var() inside a filter
 * resolves where the filter sits, not where the Tile sits, so each floods its theme's literal
 * --surface (V32 r45, from tokens.ts); --shadow-tile-soft picks the filter per [data-theme], so a
 * nested linen (or dark) subtree gets its own halo. Render it once per page.
 */
export const TileHalo = (): JSX.Element => {
  const defs = styles["defs"] ?? "tile-defs";
  return (
    <svg className={defs} width="0" height="0" aria-hidden="true" focusable="false">
      <HaloFilter theme="dark" />
      <HaloFilter theme="linen" />
    </svg>
  );
};

/**
 * T2 Tile: one `<button>` at least --hit tall, square, sized by its content. Soft is the r42
 * floating word: italic --text-muted with a 3px glyph-shaped --surface halo (--shadow-tile-soft,
 * drawn by TileHalo, which the themed root renders once), no box. Loud is the
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
  const ink = styles["ink"] ?? "tile-ink";
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
      <FocusRing />
      <span className={ink}>
        {glyph === undefined ? null : (
          <span className={mark}>
            <Icon name={glyph} />
          </span>
        )}
        <span className={text}>{label}</span>
      </span>
    </button>
  );
};
