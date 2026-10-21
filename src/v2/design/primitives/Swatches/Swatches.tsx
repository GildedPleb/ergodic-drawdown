import type { JSX, KeyboardEvent } from "react";
import { useRef } from "react";

import { Icon } from "../Icon";
import styles from "./Swatches.module.css";

export type Swatch = { name: string; colour: string };

export type SwatchesProps = {
  /** Id of the visible label that names the radio group. */
  labelledBy: string;
  options: readonly Swatch[];
  /** The picked swatch's name. */
  value: string;
  onChange?: (name: string) => void;
};

const NEXT: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * V32-BUILD §1MP item 8, Colour: 1.25rem square chips, each a radio named with its colour name
 * in a 44px target, spread across at most 22rem; the pick shows a 0.875rem --ground ✓. One tab
 * stop; the arrow keys move the pick (wrapping), Home / End jump.
 */
export const Swatches = ({ labelledBy, options, value, onChange }: SwatchesProps): JSX.Element => {
  const root = useRef<HTMLDivElement>(null);
  const at = Math.max(
    0,
    options.findIndex((o) => o.name === value),
  );
  const move = (i: number): void => {
    const n = options.length;
    const j = ((i % n) + n) % n;
    const next = options[j];
    if (next === undefined) return;
    onChange?.(next.name);
    root.current?.querySelectorAll<HTMLElement>('[role="radio"]')[j]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = NEXT[event.key];
    const jump = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : undefined;
    if (step === undefined && jump === undefined) return;
    event.preventDefault();
    move(jump ?? at + (step ?? 0));
  };
  const rootCls = styles["root"] ?? "swatches-root";
  const chip = styles["chip"] ?? "swatches-chip";
  const face = styles["face"] ?? "swatches-face";
  return (
    <div
      ref={root}
      className={rootCls}
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => (
        <button
          key={o.name}
          type="button"
          className={chip}
          role="radio"
          aria-checked={i === at}
          aria-label={o.name}
          tabIndex={i === at ? 0 : -1}
          onClick={() => {
            move(i);
          }}
        >
          <span className={face} style={{ "--dyn-c": o.colour }} aria-hidden="true">
            {i === at ? <Icon name="check" /> : null}
          </span>
        </button>
      ))}
    </div>
  );
};
