import type { JSX, Ref } from "react";
import { useEffect, useState } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs, spokenLabel } from "../LabelGlyphs";
import styles from "./UndoChip.module.css";

/** R7: variant keys and values. */
export const variants = {
  state: ["in", "out"] as const,
};

export type UndoStep = {
  /** The field's name; it truncates first. */
  field: string;
  /** The value Undo goes back to, in the field's rest format; it never truncates. */
  value: string;
};

export type UndoChipProps = {
  /** The newest step, or null once history is empty (the chip leaves). */
  step: UndoStep | null;
  /** "Undo". */
  label: string;
  /** The button's name, e.g. "Undo Years, back to 30" (the value already in words). */
  name: (field: string, value: string) => string;
  onUndo: () => void;
  /** Bumped on each undo or redo: the text replays its 200ms change (a new commit doesn't). */
  turn?: number;
  ref?: Ref<HTMLButtonElement>;
};

/** Reduced motion: the chip leaves at once (its 160ms fade only runs with no preference). */
const leaveMs = (): number =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 160;

/**
 * V32-BUILD U1: "↶ Undo · <Field>: <old value>", a square chip with a double accent frame and no
 * fill. It shows the newest step and updates in place; with no step it fades out (160ms) and
 * unmounts. No timeout (WCAG 2.2.1). The parent owns where it sits and what it announces.
 */
export const UndoChip = ({
  step,
  label,
  name,
  onUndo,
  turn = 0,
  ref,
}: UndoChipProps): JSX.Element | null => {
  const [kept, setKept] = useState(step);
  // Held while it leaves; a new step replaces the text in place (no re-slide).
  if (step !== null && (step.field !== kept?.field || step.value !== kept.value)) setKept(step);
  useEffect(() => {
    if (step !== null) return undefined;
    const done = window.setTimeout(() => {
      setKept(null);
    }, leaveMs());
    return () => {
      window.clearTimeout(done);
    };
  }, [step]);
  if (kept === null) return null;
  const state: (typeof variants.state)[number] = step === null ? "out" : "in";
  return (
    <button
      ref={ref}
      type="button"
      className={styles["root"]}
      data-state={state}
      aria-label={name(kept.field, spokenLabel(kept.value))}
      aria-hidden={step === null ? true : undefined}
      tabIndex={step === null ? -1 : undefined}
      onClick={() => {
        if (step !== null) onUndo();
      }}
    >
      <Icon name="undo" />
      <span key={turn} className={styles["text"]}>
        <span className={styles["word"]}>{label}</span>
        {" · "}
        <span className={styles["field"]}>{kept.field}</span>
        <span className={styles["value"]}>
          {": "}
          <LabelGlyphs text={kept.value} decorative />
        </span>
      </span>
    </button>
  );
};
