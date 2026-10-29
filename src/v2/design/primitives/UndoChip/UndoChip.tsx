import type { JSX, Ref } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs, spokenLabel } from "../LabelGlyphs";
import styles from "./UndoChip.module.css";

/** R7: variant keys and values. */
export const variants = {
  state: ["in", "out"] as const,
  /** :861 (a): what still shows when the whole text doesn't fit (unset: all of it). */
  fit: ["value", "word", "glyph"] as const,
};

type Fit = (typeof variants.fit)[number] | undefined;

/** :861 (a): whole pieces give way: the field and colon, the value and ·, then the word. */
const FITS: readonly Fit[] = [undefined, ...variants.fit];

/** The first fit, widest first, whose text fits; the glyph alone always stays. */
export const pickFit = (fits: (fit: Fit) => boolean): Fit =>
  FITS.find((fit) => fit === "glyph" || fits(fit));

export type UndoStep = {
  /** The field's name; it is dropped whole first. */
  field: string;
  /** The value Undo goes back to, in the field's rest format; never shown in part. */
  value: string;
};

export type UndoChipProps = {
  /** The newest step, or null once history is empty (the chip leaves). */
  step: UndoStep | null;
  /** "Undo". */
  label: string;
  /** The button's name and title, e.g. "Undo, Years back to 30" (the value already in words). */
  name: (field: string, value: string) => string;
  onUndo: () => void;
  ref?: Ref<HTMLButtonElement>;
};

/** Reduced motion: the chip leaves at once (its 160ms fade only runs with no preference). */
const leaveMs = (): number =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 160;

/**
 * V32-BUILD U1: "↶ Undo · <Field>: <old value>", a square chip with a double accent frame and no
 * fill. It shows the newest step and its text swaps in place, instantly (the restored field tweens); with no step it fades out (160ms) and
 * unmounts. No timeout (WCAG 2.2.1). The parent owns where it sits and what it announces. Text
 * that doesn't fit drops whole pieces, measured on every resize (:861 (a)); nothing is clipped.
 */
export const UndoChip = ({ step, label, name, onUndo, ref }: UndoChipProps): JSX.Element | null => {
  const [kept, setKept] = useState(step);
  // Held while it leaves; a new step replaces the text in place (no re-slide).
  if (step !== null && (step.field !== kept?.field || step.value !== kept.value)) setKept(step);
  const own = useRef<HTMLButtonElement | null>(null);
  const attach = (node: HTMLButtonElement | null): void => {
    own.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref != null) ref.current = node;
  };
  // Set on the node, not rendered: each try needs layout before the next.
  useLayoutEffect(() => {
    const root = own.current;
    if (root === null || typeof ResizeObserver !== "function") return undefined;
    const fit = (): void => {
      const chosen = pickFit((f) => {
        if (f === undefined) delete root.dataset["fit"];
        else root.dataset["fit"] = f;
        return root.scrollWidth <= root.clientWidth;
      });
      if (chosen === undefined) delete root.dataset["fit"];
      else root.dataset["fit"] = chosen;
    };
    fit();
    let frame = 0;
    const seen = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    // The slot follows the chip; its containing block follows the viewport.
    for (const box of [root.parentElement, root.offsetParent]) if (box !== null) seen.observe(box);
    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
    };
  }, [kept?.field, kept?.value, label]);
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
  const named = name(kept.field, spokenLabel(kept.value));
  return (
    <button
      ref={attach}
      type="button"
      className={styles["root"]}
      data-state={state}
      aria-label={named}
      title={named}
      aria-hidden={step === null ? true : undefined}
      tabIndex={step === null ? -1 : undefined}
      onClick={() => {
        if (step !== null) onUndo();
      }}
    >
      <Icon name="undo" />
      <span className={styles["text"]}>
        <span className={styles["word"]}>{label}</span>
        <span className={styles["tail"]}>
          {"\u00a0·\u00a0"}
          <span className={styles["field"]}>{kept.field}: </span>
          <LabelGlyphs text={kept.value} decorative />
        </span>
      </span>
    </button>
  );
};
