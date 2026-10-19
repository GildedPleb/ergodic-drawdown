import type { ChangeEvent, JSX } from "react";
import { useId } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs } from "../LabelGlyphs";
import styles from "./Select.module.css";

/** R7: variant keys and values. */
export const variants = {
  invalid: ["true", "false"] as const,
  disabled: ["true", "false"] as const,
  label: ["visible", "hidden"] as const,
};

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  /** Accessible name; drawn as a <label> unless labelVisibility is "hidden". */
  label: string;
  labelVisibility?: (typeof variants.label)[number];
  options: readonly (string | SelectOption)[];
  value: string;
  onChange?: (next: string) => void;
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
};

const normalize = (o: string | SelectOption): SelectOption =>
  typeof o === "string" ? { value: o, label: o } : o;

/**
 * A native <select> (keyboard, mobile pickers, autofill, form semantics) wrapped in the design face.
 * The native control sits transparent over the face and takes every pointer and key event; the face
 * draws the selected label through LabelGlyphs so emoji labels render as glyphs, never an emoji font.
 * The option text and the accessible value stay the exact strings.
 */
export const Select = ({
  label,
  labelVisibility = "visible",
  options,
  value,
  onChange,
  id,
  name,
  autoComplete,
  disabled = false,
  invalid = false,
  error,
}: SelectProps): JSX.Element => {
  const root = styles["root"] ?? "select-root";
  const labelCls = styles["label"] ?? "select-label";
  const field = styles["field"] ?? "select-field";
  const control = styles["control"] ?? "select-control";
  const face = styles["face"] ?? "select-face";
  const faceValue = styles["value"] ?? "select-value";
  const caret = styles["caret"] ?? "select-caret";
  const errorIcon = styles["errorIcon"] ?? "field-error-icon";
  const errorCls = styles["error"] ?? "select-error";

  const autoId = useId();
  const controlId = id ?? `select-${autoId}`;
  const errorId = `${controlId}-error`;
  const items = options.map(normalize);
  const selected = items.find((o) => o.value === value)?.label ?? value;
  const showError = invalid && error !== undefined;

  const handle = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange?.(event.target.value);
  };

  return (
    <div
      className={root}
      data-invalid={invalid ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
      data-label={labelVisibility}
    >
      {labelVisibility === "visible" ? (
        <label className={labelCls} htmlFor={controlId}>
          <LabelGlyphs text={label} />
        </label>
      ) : null}
      <span className={field}>
        <span className={face} aria-hidden="true">
          <span className={faceValue}>
            <LabelGlyphs text={selected} />
          </span>
          <span className={caret}>
            <Icon name="chevron" />
          </span>
        </span>
        <select
          className={control}
          id={controlId}
          name={name}
          autoComplete={autoComplete}
          aria-label={labelVisibility === "hidden" ? label : undefined}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={showError ? errorId : undefined}
          disabled={disabled}
          value={value}
          onChange={handle}
        >
          {items.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
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
