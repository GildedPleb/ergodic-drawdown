import type { JSX, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { linearScale, type Scale, snapTo } from "./scale";
import styles from "./Slider.module.css";

/** R7: variant keys and values. */
export const variants = {
  disabled: ["true", "false"] as const,
};

export type SliderProps = {
  /** Accessible name (the ledger row shows the visible label). */
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Saves on release: pointer up, or key up after a (held) step key. */
  onCommit?: (next: number) => void;
  /** Spoken value (aria-valuetext). */
  valueText?: ((value: number) => string) | undefined;
  disabled?: boolean;
  /** §1Q: a focus-range scale (default: linear min…max). */
  scale?: Scale | undefined;
  /** §1Q: small ticks on the track; a mark with a label shows it under the track. */
  marks?: readonly { value: number; label?: string }[] | undefined;
};

const KEYS = new Set(["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "PageUp", "PageDown"]);
const ENDS = new Set(["Home", "End"]);

/**
 * The preview after a key (§1Q): arrows step by the scale's step at the value (the step inside a
 * focus range, ~5% above it), Page keys by 10 steps, Home/End jump to the track's ends; null = not
 * ours. Never below min or above max (a typed value past the soft top can still step down).
 */
export const keyStep = (
  key: string,
  draft: number,
  { min, max, step, scale }: { min: number; max: number; step: number; scale: Scale },
): number | null => {
  if (ENDS.has(key)) return key === "Home" ? min : scale.top;
  if (!KEYS.has(key)) return null;
  const up = ["ArrowUp", "ArrowRight", "PageUp"].includes(key);
  const size = key.startsWith("Page") ? step * 10 : scale.stepAt(draft, up);
  return Math.min(max, Math.max(min, snapTo(draft + (up ? size : -size), min, step)));
};

const pct = (pos: number): string => `${pos * 100}%`;

/**
 * Certificate slider (V32-BUILD §1f): 1px --control-line track, 2px --accent fill, a 5×18 square
 * --accent thumb with a 2px --surface halo, and a muted tick at the value it had when it mounted.
 * Dragging and held keys move a preview; the value commits once, on release (FL-001).
 */
export const Slider = ({
  label,
  value,
  min,
  max,
  step,
  onCommit,
  valueText,
  disabled = false,
  scale: given,
  marks = [],
}: SliderProps): JSX.Element => {
  const scale = given ?? linearScale(min, max, step);
  const [draft, setDraft] = useState(value);
  const [previous] = useState(value);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setDraft(value);
  }, [value]);

  const commit = (n: number): void => {
    if (n !== value) onCommit?.(n);
  };

  const range = { min, max, step, scale };
  const fromPointer = (event: PointerEvent<HTMLDivElement>): number => {
    const box = track.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0) return draft;
    return scale.toValue((event.clientX - box.left) / box.width);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const next = keyStep(event.key, draft, range);
    if (next === null) return;
    event.preventDefault();
    setDraft(next);
  };

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (KEYS.has(event.key) || ENDS.has(event.key)) commit(draft);
  };

  const root = styles["root"] ?? "slider-root";
  const rail = styles["rail"] ?? "slider-rail";
  const fill = styles["fill"] ?? "slider-fill";
  const tick = styles["tick"] ?? "slider-tick";
  const thumb = styles["thumb"] ?? "slider-thumb";
  const mark = styles["mark"] ?? "slider-mark";
  const markLabel = styles["markLabel"] ?? "slider-mark-label";
  const brk = styles["brk"] ?? "slider-break";
  const at = pct(scale.toPos(draft));

  return (
    <div
      ref={track}
      className={root}
      data-disabled={disabled ? "true" : "false"}
      onPointerDown={(event) => {
        if (disabled) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDraft(fromPointer(event));
      }}
      onPointerMove={(event) => {
        if (dragging.current) setDraft(fromPointer(event));
      }}
      onPointerUp={(event) => {
        if (!dragging.current) return;
        dragging.current = false;
        commit(fromPointer(event));
      }}
      onPointerCancel={() => {
        dragging.current = false;
        setDraft(value);
      }}
    >
      <span className={rail} aria-hidden="true">
        <span className={fill} style={{ "--dyn-at": at }} />
        <span className={tick} style={{ "--dyn-was": pct(scale.toPos(previous)) }} />
        {marks.map((m) => (
          <span key={m.value} className={mark} style={{ "--dyn-was": pct(scale.toPos(m.value)) }}>
            {m.label === undefined ? null : <span className={markLabel}>{m.label}</span>}
          </span>
        ))}
        {scale.breakAt === null ? null : (
          <span className={brk} style={{ "--dyn-was": pct(scale.breakAt) }} />
        )}
      </span>
      <span
        className={thumb}
        style={{ "--dyn-at": at }}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={Math.max(scale.top, draft)}
        aria-valuenow={draft}
        aria-valuetext={valueText?.(draft)}
        aria-disabled={disabled}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => {
          commit(draft);
        }}
      />
    </div>
  );
};
