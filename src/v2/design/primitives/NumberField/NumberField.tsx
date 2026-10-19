import type { JSX, KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs } from "../LabelGlyphs";
import { focusNextOnEnter } from "./enter";
import styles from "./NumberField.module.css";
import {
  createSettledNumber,
  type NumberParse,
  parseNumber,
  type NumberRule,
  type SettleController,
  type SettleOptions,
} from "./settle";

/** R7: variant keys and values. */
export const variants = {
  invalid: ["true", "false"] as const,
  disabled: ["true", "false"] as const,
};

export type { NumberRule } from "./settle";

export type NumberFieldProps = {
  label: string;
  /** The committed value (the app state). */
  value: number;
  /** Called with each value main would commit (see settle.ts). */
  onCommit?: (next: number) => void;
  /** main's acceptance rule for this field. Default: settle, accept every number. */
  rule?: NumberRule;
  /** "float" (parseFloat) or "int" (main's canonical integer). */
  parse?: NumberParse;
  /** Bounds and step for arrow keys and aria-value*; acceptance is the rule's job. */
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  id?: string | undefined;
  name?: string | undefined;
  autoComplete?: string | undefined;
  disabled?: boolean;
  /** Force the Invalid state (otherwise it follows a rejected draft). */
  invalid?: boolean;
  /**
   * Plain-language message shown with ⚠ while invalid: the cause, the next step and the
   * reassurance. A function receives the value still in use. Wired with aria-describedby.
   */
  error?: string | ((current: number) => string) | undefined;
  /** Caption under the field (e.g. "(~40 years)"). */
  hint?: string | undefined;
  /** Text already typed at mount (stories and tests: show a draft such as a rejected "4"). */
  initialText?: string | undefined;
};

const finite = (n: number | undefined): number | undefined =>
  n !== undefined && Number.isFinite(n) ? n : undefined;

const decimalsOf = (n: number): number => {
  const s = String(n);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
};

/**
 * A text input (m7: inputMode keypads, no browser spinners, our own Postel-liberal parser) with
 * spinbutton semantics and arrow-key steps, committing exactly what main's inputs commit (B3).
 */
export const NumberField = ({
  label,
  value,
  onCommit,
  rule = { kind: "settle", accept: () => true },
  parse = "float",
  min,
  max,
  step,
  id,
  name,
  autoComplete = "off",
  disabled = false,
  invalid,
  error,
  hint,
  initialText,
}: NumberFieldProps): JSX.Element => {
  const root = styles["root"] ?? "number-root";
  const labelCls = styles["label"] ?? "number-label";
  const field = styles["field"] ?? "number-field";
  const control = styles["control"] ?? "number-control";
  const hintCls = styles["hint"] ?? "number-hint";
  const errorIcon = styles["errorIcon"] ?? "field-error-icon";
  const errorCls = styles["error"] ?? "number-error";

  const autoId = useId();
  const controlId = id ?? `number-${autoId}`;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;

  const valueRef = useRef(value);
  valueRef.current = value;
  const options = useRef<SettleOptions>({
    rule,
    parse,
    commit: (n) => onCommit?.(n),
    getValue: () => valueRef.current,
  });
  options.current.rule = rule;
  options.current.parse = parse;
  options.current.commit = (n) => onCommit?.(n);
  const controller = useRef<SettleController | null>(null);
  if (controller.current === null) {
    controller.current = createSettledNumber(value, options.current);
    if (initialText !== undefined) controller.current.change(initialText);
  }
  const settle = controller.current;
  const [draft, setDraft] = useState(() => settle.draft());
  const held = useRef(false);
  const [rejected, setRejected] = useState(() => settle.rejected());

  useEffect(() => {
    settle.sync(value);
    setDraft(settle.draft());
    setRejected(settle.rejected());
  }, [settle, value]);

  const refresh = (): void => {
    setDraft(settle.draft());
    setRejected(settle.rejected());
  };
  const change = (text: string): void => {
    settle.change(text);
    refresh();
  };
  const blur = (): void => {
    held.current = false;
    settle.blur();
    refresh();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      blur();
      focusNextOnEnter(event);
      return;
    }
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && step !== undefined) {
      event.preventDefault();
      // FL-001: a held key steps the visible draft but commits once, on release (onKeyUp).
      const shown = parseNumber(settle.draft(), parse);
      const current = event.repeat && Number.isFinite(shown) ? shown : valueRef.current;
      const base = Number.isNaN(current) ? (min ?? 0) : current;
      let next = base + (event.key === "ArrowUp" ? step : -step);
      if (max !== undefined) next = Math.min(max, next);
      if (min !== undefined) next = Math.max(min, next);
      const text = next.toFixed(Math.max(decimalsOf(step), decimalsOf(base)));
      if (event.repeat) {
        held.current = true;
        settle.preview(text);
        refresh();
      } else {
        change(text);
      }
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && held.current) {
      held.current = false;
      change(settle.draft());
    }
  };

  const isInvalid = invalid ?? rejected;
  const message = typeof error === "function" ? error(value) : error;
  const showError = isInvalid && message !== undefined;
  const describedBy =
    [hint === undefined ? "" : hintId, showError ? errorId : ""].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div
      className={root}
      data-invalid={isInvalid ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
    >
      <label className={labelCls} htmlFor={controlId}>
        <LabelGlyphs text={label} />
      </label>
      <div className={field}>
        <input
          className={control}
          id={controlId}
          name={name}
          type="text"
          role="spinbutton"
          inputMode={parse === "int" ? "numeric" : "decimal"}
          autoComplete={autoComplete}
          spellCheck={false}
          aria-valuenow={Number.isFinite(value) ? value : undefined}
          aria-valuemin={finite(min)}
          aria-valuemax={finite(max)}
          value={draft}
          disabled={disabled}
          aria-invalid={isInvalid ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            change(event.target.value);
          }}
          onBlur={blur}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
        {hint === undefined ? null : (
          <span className={hintCls} id={hintId}>
            {hint}
          </span>
        )}
      </div>
      {showError ? (
        <span className={errorCls} id={errorId}>
          <span className={errorIcon}>
            <Icon name="warning" />
          </span>
          <span>{message}</span>
        </span>
      ) : null}
    </div>
  );
};
