import type { ChangeEvent, JSX } from "react";
import { useId } from "react";

import { Icon } from "../Icon";
import { LabelGlyphs } from "../LabelGlyphs";
import { focusNextOnEnter } from "../NumberField/enter";
import styles from "./Select.module.css";

/** R7: variant keys and values. */
export const variants = {
  invalid: ["true", "false"] as const,
  disabled: ["true", "false"] as const,
  /** "visible": our own <label>. "external": labelled by visible text elsewhere (aria-labelledby). */
  label: ["visible", "external"] as const,
};

export type SelectOption = { value: string; label: string };

type Labelling =
  | { label: string; labelledBy?: undefined }
  /** Id of visible text that names the field (e.g. the pane heading). No invented wording (m4). */
  | { label?: undefined; labelledBy: string };

export type SelectProps = Labelling & {
  options: readonly (string | SelectOption)[];
  value: string;
  onChange?: (next: string) => void;
  id?: string | undefined;
  name?: string | undefined;
  autoComplete?: string | undefined;
  disabled?: boolean;
  invalid?: boolean;
  /**
   * Plain-language message shown with ⚠ when invalid: the cause and the next step
   * ("That walk isn't available. Pick one from the list."). Wired with aria-describedby.
   */
  error?: string | undefined;
};

const normalize = (o: string | SelectOption): SelectOption =>
  typeof o === "string" ? { value: o, label: o } : o;

/**
 * A native <select> (keyboard, mobile pickers, autofill, form semantics) in the design face. The
 * native control shares the face's grid cell, transparent and on top, and takes every pointer and
 * key event; the aria-hidden face draws the value through LabelGlyphs in decorative mode, so an
 * emoji label is SVG and no text node ever shapes an emoji font (B2). Only the OPEN native picker
 * (OS chrome) may show system emoji: the documented exception (TOKENS.md).
 */
export const Select = ({
  label,
  labelledBy,
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
  const labelMode: (typeof variants.label)[number] =
    labelledBy === undefined ? "visible" : "external";

  const handle = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange?.(event.target.value);
  };

  return (
    <div
      className={root}
      data-invalid={invalid ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
      data-label={labelMode}
    >
      {label === undefined ? null : (
        <label className={labelCls} htmlFor={controlId}>
          <LabelGlyphs text={label} />
        </label>
      )}
      <span className={field}>
        <span className={face} aria-hidden="true">
          <span className={faceValue}>
            <LabelGlyphs text={selected} decorative />
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
          aria-labelledby={labelledBy}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={showError ? errorId : undefined}
          disabled={disabled}
          value={value}
          onChange={handle}
          onKeyDown={focusNextOnEnter}
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
