import type { JSX, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

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
  valueText?: (value: number) => string;
  disabled?: boolean;
};

const KEYS = new Set(["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "PageUp", "PageDown"]);
const ENDS = new Set(["Home", "End"]);

export const snap = (n: number, min: number, max: number, step: number): number => {
  const stepped = min + Math.round((n - min) / step) * step;
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Math.min(max, Math.max(min, Number(stepped.toFixed(decimals))));
};

/** The preview after a key: arrows step, Page keys step ×10, Home/End jump; null = not ours. */
export const keyStep = (
  key: string,
  draft: number,
  { min, max, step }: { min: number; max: number; step: number },
): number | null => {
  if (ENDS.has(key)) return key === "Home" ? min : max;
  if (!KEYS.has(key)) return null;
  const dir = ["ArrowUp", "ArrowRight", "PageUp"].includes(key) ? 1 : -1;
  const size = key.startsWith("Page") ? step * 10 : step;
  return snap(draft + dir * size, min, max, step);
};

/** The value under a pointer at clientX on a track box; null when the box has no width. */
export const trackValue = (
  clientX: number,
  box: { left: number; width: number } | undefined,
  { min, max, step }: { min: number; max: number; step: number },
): number | null => {
  if (box === undefined || box.width === 0) return null;
  const t = (clientX - box.left) / box.width;
  return snap(min + t * (max - min), min, max, step);
};

const pct = (n: number, min: number, max: number): string =>
  `${max > min ? ((n - min) / (max - min)) * 100 : 0}%`;

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
}: SliderProps): JSX.Element => {
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

  const range = { min, max, step };
  const fromPointer = (event: PointerEvent<HTMLDivElement>): number =>
    trackValue(event.clientX, track.current?.getBoundingClientRect(), range) ?? draft;

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
  const at = pct(draft, min, max);

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
        <span className={tick} style={{ "--dyn-was": pct(previous, min, max) }} />
      </span>
      <span
        className={thumb}
        style={{ "--dyn-at": at }}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
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
