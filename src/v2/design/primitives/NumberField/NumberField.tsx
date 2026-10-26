import type { JSX, KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs } from "../LabelGlyphs";
import {
  type Bounds,
  type EntryResult,
  type NumberParse,
  onBound,
  parseNumber,
  resolveEntry,
  editNumber,
  keptText,
  shownAt,
  speakNumber,
  stepValue,
} from "./entry";
import styles from "./NumberField.module.css";
import { createSettle, type Settle } from "./settle";
import { afterEdit, afterValue, messageOf, type Status, statusOf } from "./status";
import { createThrottle, type Throttle } from "./throttle";

/** R7: variant keys and values. */
export const variants = {
  invalid: ["true", "false"] as const,
  disabled: ["true", "false"] as const,
  label: ["visible", "hidden"] as const,
};

export type NumberFieldProps = {
  label: string;
  /** The row above already shows the label (a ledger row editor): keep it for assistive tech only. */
  labelHidden?: boolean;
  /** The committed value (app state). Only in-range, finite values ever reach `onCommit`. */
  value: number;
  onCommit?: (next: number) => void;
  /** "float" or "int" (whole numbers only). */
  parse?: NumberParse;
  /** The back end's accepted range, read on every commit (a model switch takes effect at once). */
  bounds?: Bounds;
  /** What an empty field commits; null: empty is invalid. */
  emptyValue?: number | null;
  /** A count (e.g. Previous Halvings): whole numbers only, never rounded (Form 2g/2h). */
  whole?: boolean;
  /** Form 2a: at rest, an ordinary value shows rounded to this many decimals (R, +/-: 2). */
  places?: number | undefined;
  /** Arrow-key step (PgUp/PgDn step ×10). */
  step?: number;
  /**
   * Form 4d/4e: the short note after any clamp (Enter, blur, a held key, the wheel), e.g.
   * "Max is 1,000"; shown until the field is next edited.
   */
  limitNote?: (used: number, bounds: Bounds) => string;
  /** Form 2j: the short note for text that isn't a number ("Numbers only"; gets the value in use). */
  invalidMessage?: (current: number) => string;
  /** Form 2g: the note for a fraction or stray comma in a whole-number field ("1.5", "2,5"). */
  wholeMessage?: string | undefined;
  /** Form 2g: the note for a comma that isn't thousands grouping in a decimal field ("2,5"). */
  dotMessage?: string | undefined;
  /** Caption under the field (e.g. "(~40 years)"). */
  hint?: string | undefined;
  id?: string | undefined;
  disabled?: boolean;
  /** Stories and tests: text typed after mount, then committed (e.g. "abc" or "4"). */
  initialText?: string | undefined;
};

const STEP_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown"]);
const ANY: Bounds = { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
const finite = (n: number): number | undefined => (Number.isFinite(n) ? n : undefined);

/**
 * A number field that passes Probe's M3 / FL-001 gate (V32-BUILD §1g): typing edits a draft and
 * never commits; Enter or blur commits once; out-of-range values clamp to the nearest bound with a
 * visible, politely announced message; unparseable text shows the invalid state (no orange or red)
 * and keeps the last valid value, and on blur the field shows that value again (Form 2i). A held step key, or the wheel (only with focus), renders live: it
 * commits at most every HELD_COMMIT_MS while held (throttle.ts), then exactly once more on release
 * or when the wheel settles (settle.ts). A step that lands on a bound shows the same clamp message
 * on commit (Probe m6).
 */
/**
 * Form ruling 4: a ×10 value is spoken in words ("1.2 times 10 to the 12"), never as digits; 4a/2a:
 * whenever the resting text isn't the full value, it is what's spoken.
 */
const spokenOf = (value: number, places?: number): string | undefined => {
  const shown = shownAt(places)(value);
  return shown.includes("×") || shown !== editNumber(value)
    ? speakNumber(value, places)
    : undefined;
};

export const NumberField = ({
  label,
  labelHidden = false,
  value,
  onCommit,
  parse = "float",
  bounds = ANY,
  emptyValue = null,
  whole = false,
  places,
  step,
  limitNote,
  invalidMessage,
  wholeMessage,
  dotMessage,
  hint,
  id,
  disabled = false,
  initialText,
}: NumberFieldProps): JSX.Element => {
  const autoId = useId();
  const controlId = id ?? `number-${autoId}`;
  const messageId = `${controlId}-message`;
  const hintId = `${controlId}-hint`;

  const input = useRef<HTMLInputElement | null>(null);
  // §1P: a click that focuses the field selects its whole value, so typing replaces it.
  const pressedIn = useRef(false);
  const [draft, setDraft] = useState(() => editNumber(value));
  // 4a/4c/2a: the text of the last commit (as typed, or the value used). Focused, or mid-edit,
  // the field shows its draft; at rest, the resting form (×10 at 3 significant figures, R and
  // +/- at 2 decimals).
  const clean = useRef(draft);
  const [focused, setFocused] = useState(false);
  const display = focused || draft !== clean.current ? draft : shownAt(places)(value);
  const [status, setStatus] = useState<Status>({ kind: "ok" });
  const live = useRef({ bounds, draft, emptyValue, onCommit, parse, step, value, whole });
  live.current = { bounds, draft, emptyValue, onCommit, parse, step, value, whole };
  const held = useRef(false);
  // m6: the last step (key or wheel) stopped on a finite bound.
  const atBound = useRef(false);
  // The value last handed to onCommit, until the parent re-renders with it: throttled commits land
  // faster than `value` catches up, so a repeat of the same value is never sent twice.
  const sent = useRef<number | null>(null);

  /** Commit `text`; returns the result's kind, so blur can put back the value in use (2i). */
  const commit = (text: string, stepped = false): EntryResult["kind"] => {
    const now = live.current;
    const result = resolveEntry(text, now.parse, now.bounds, now.emptyValue, now.whole);
    setStatus(statusOf(result, stepped && atBound.current));
    if (result.kind === "invalid") return result.kind;
    if (result.value !== (sent.current ?? now.value)) {
      sent.current = result.value;
      now.onCommit?.(result.value);
    }
    const kept = keptText(text, now.parse, result.value);
    clean.current = kept;
    setDraft(kept);
    return result.kind;
  };
  /** Form 2i: the draft becomes the value in use again (its resting form once unfocused). */
  const revert = (): void => {
    clean.current = editNumber(live.current.value);
    setDraft(clean.current);
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const throttle = useRef<Throttle | null>(null);
  throttle.current ??= createThrottle(() => {
    commitRef.current(live.current.draft, true);
  });
  const hold = throttle.current;
  const settle = useRef<Settle | null>(null);
  // The wheel's release is its settle: the trailing commit lands WHEEL_SETTLE_MS after the last notch.
  settle.current ??= createSettle(() => {
    hold.release();
  });
  const wheel = settle.current;

  /** Step the draft (never the value) and remember whether the step stopped on a bound. */
  const stepDraft = (direction: 1 | -1, big: boolean): boolean => {
    const now = live.current;
    if (now.step === undefined) return false;
    const shown = parseNumber(now.draft, now.parse);
    const base = Number.isNaN(shown) ? now.value : shown;
    const next = stepValue(base, direction, now.step, now.bounds, big);
    atBound.current = onBound(next, now.bounds);
    const text = editNumber(next);
    // Several notches can land before React re-renders: the next step reads this draft.
    live.current = { ...now, draft: text };
    setDraft(text);
    return true;
  };

  // The engine value changed elsewhere (a model switch resets the variable): show it unless the
  // person is mid-edit in this field.
  // Form 4h: a value from anywhere else clears a clamp note; this field's own commit keeps it.
  useEffect(() => {
    const own = sent.current;
    sent.current = null;
    setStatus((was) => afterValue(was, value, own));
    if (document.activeElement === input.current) return;
    clean.current = editNumber(value);
    setDraft(clean.current);
  }, [value]);

  useEffect(() => {
    if (initialText !== undefined) commitRef.current(initialText);
  }, [initialText]);

  useEffect(
    () => () => {
      wheel.cancel();
      hold.cancel();
    },
    [wheel, hold],
  );

  // React's onWheel is passive; a native listener can cancel the scroll, and only with focus.
  useEffect(() => {
    const element = input.current;
    if (element === null) return undefined;
    const onWheel = (event: WheelEvent): void => {
      if (document.activeElement !== element || event.deltaY === 0) return;
      event.preventDefault();
      // Each notch steps the draft and renders live (throttled); a trailing commit on settle.
      if (!stepDraft(event.deltaY < 0 ? 1 : -1, false)) return;
      hold.poke();
      wheel.poke();
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
    };
  });

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      const stepped = wheel.pending() || held.current;
      wheel.cancel();
      hold.cancel();
      held.current = false;
      commit(live.current.draft, stepped);
      return;
    }
    if (event.key === "Escape") {
      wheel.cancel();
      hold.cancel();
      clean.current = editNumber(value);
      setDraft(clean.current);
      setStatus({ kind: "ok" });
      return;
    }
    if (!STEP_KEYS.has(event.key)) return;
    event.preventDefault();
    const up = event.key === "ArrowUp" || event.key === "PageUp";
    // A held key renders live: commits at most every HELD_COMMIT_MS, one more on release.
    if (!stepDraft(up ? 1 : -1, event.key.startsWith("Page"))) return;
    held.current = true;
    hold.poke();
  };

  const onKeyUp = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (!STEP_KEYS.has(event.key) || !held.current) return;
    held.current = false;
    hold.release();
  };

  const invalid = status.kind === "invalid";
  const message = messageOf(status, value, bounds, {
    limitNote,
    invalidMessage,
    wholeMessage,
    dotMessage,
  });
  const describedBy = [hint === undefined ? "" : hintId, message === "" ? "" : messageId]
    .filter(Boolean)
    .join(" ");

  const labelElement = (
    <label className={styles["label"]} htmlFor={controlId}>
      <LabelGlyphs text={label} />
    </label>
  );
  const hintElement = (
    <span className={styles["hint"]} id={hintId}>
      {hint}
    </span>
  );
  const icon = (
    <span className={styles["errorIcon"]}>
      <Icon name="warning" />
    </span>
  );

  return (
    <div
      className={styles["root"]}
      data-invalid={invalid ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
      data-label={labelHidden ? "hidden" : "visible"}
    >
      {labelHidden ? null : labelElement}
      <div className={styles["field"]}>
        <input
          ref={input}
          className={styles["control"]}
          id={controlId}
          type="text"
          role="spinbutton"
          inputMode={parse === "int" || whole ? "numeric" : "decimal"}
          autoComplete="off"
          spellCheck={false}
          aria-label={labelHidden ? label : undefined}
          aria-valuenow={finite(value)}
          aria-valuetext={spokenOf(value, places)}
          aria-valuemin={finite(bounds.min)}
          aria-valuemax={finite(bounds.max)}
          value={display}
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy === "" ? undefined : describedBy}
          onChange={(event) => {
            setDraft(event.target.value);
            setStatus(afterEdit);
          }}
          onBlur={() => {
            setFocused(false);
            if (held.current) {
              held.current = false;
              wheel.cancel();
              hold.release();
              return;
            }
            if (wheel.flush()) return;
            if (draft !== clean.current || status.kind === "invalid") {
              // Form 2i: focus leaving after an invalid entry shows the last committed value again
              // (the field never shows text that isn't the value in use); the note stays (4h).
              if (commit(draft) === "invalid") revert();
            }
          }}
          onFocus={(event) => {
            setFocused(true);
            event.currentTarget.value = draft; // before select(), so React's re-render keeps it
            event.currentTarget.select();
          }}
          onPointerDown={(event) => {
            pressedIn.current = document.activeElement !== event.currentTarget;
          }}
          onPointerUp={(event) => {
            if (!pressedIn.current) return;
            pressedIn.current = false;
            event.preventDefault();
            event.currentTarget.select();
          }}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
        {hint === undefined ? null : hintElement}
      </div>
      {/* Always mounted so a clamp or invalid message is announced politely when it appears. */}
      <p className={styles["message"]} id={messageId} aria-live="polite">
        {invalid && message !== "" ? icon : null}
        {message}
      </p>
    </div>
  );
};
