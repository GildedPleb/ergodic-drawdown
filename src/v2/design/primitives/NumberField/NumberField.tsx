import type { ChangeEvent, CSSProperties, JSX } from "react";
import { useId } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs } from "../LabelGlyphs";
import styles from "./NumberField.module.css";

/** R7: variant keys and values. */
export const variants = {
  invalid: ["true", "false"] as const,
  disabled: ["true", "false"] as const,
};

export type NumberFieldProps = {
  label: string;
  value: number;
  /** Fires with the parsed number; NaN while the field is empty or mid-edit. */
  onChange?: (next: number) => void;
  /** "float" (parseFloat) or "int" (parseInt, base 10). */
  parse?: "float" | "int";
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  id?: string | undefined;
  name?: string | undefined;
  autoComplete?: string | undefined;
  disabled?: boolean;
  invalid?: boolean;
  /**
   * Plain-language message shown with a ⚠ icon when invalid: the cause and the next step
   * ("Volatility must be 0 to 1. Enter a number from 0 to 1."). Wired with aria-describedby.
   */
  error?: string | undefined;
  /** Visible digits the field is sized for; default from min / max / step. */
  chars?: number | undefined;
};

const widthChars = (min?: number, max?: number, step?: number): number => {
  const longest = [min, max, step]
    .filter((n): n is number => n !== undefined && Number.isFinite(n))
    .map((n) => String(n).length);
  return Math.max(4, ...longest) + 1;
};

/**
 * A native <input type="number"> (spinners, numeric keypads, autofill, form semantics) in the design
 * frame. min / max / step pass straight through, so ranges and steps stay exactly the caller's.
 */
export const NumberField = ({
  label,
  value,
  onChange,
  parse = "float",
  min,
  max,
  step,
  id,
  name,
  autoComplete = "off",
  disabled = false,
  invalid = false,
  error,
  chars,
}: NumberFieldProps): JSX.Element => {
  const root = styles["root"] ?? "number-root";
  const labelCls = styles["label"] ?? "number-label";
  const control = styles["control"] ?? "number-control";
  const errorIcon = styles["errorIcon"] ?? "field-error-icon";
  const errorCls = styles["error"] ?? "number-error";

  const autoId = useId();
  const controlId = id ?? `number-${autoId}`;
  const errorId = `${controlId}-error`;
  const showError = invalid && error !== undefined;

  const style = {
    ["--dyn-field-chars" as string]: `${chars ?? widthChars(min, max, step)}ch`,
  } satisfies CSSProperties;

  const handle = (event: ChangeEvent<HTMLInputElement>): void => {
    const raw = event.target.value;
    onChange?.(parse === "int" ? Number.parseInt(raw, 10) : Number.parseFloat(raw));
  };

  return (
    <div
      className={root}
      style={style}
      data-invalid={invalid ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
    >
      <label className={labelCls} htmlFor={controlId}>
        <LabelGlyphs text={label} />
      </label>
      <input
        className={control}
        id={controlId}
        name={name}
        type="number"
        inputMode={parse === "int" ? "numeric" : "decimal"}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(value) ? "" : value}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={showError ? errorId : undefined}
        onChange={handle}
      />
      {showError ? (
        <span className={errorCls} id={errorId}>
          <span className={errorIcon}>
            <Icon name="warning" />
          </span>
          <span>{error}</span>
        </span>
      ) : null}
    </div>
  );
};
