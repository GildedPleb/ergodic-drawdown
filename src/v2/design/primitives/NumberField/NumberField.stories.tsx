import type { ReactElement } from "react";
import { useState } from "react";

import { NumberField } from "./NumberField";

/** Plain CSF 3, no Storybook/Ladle imports. Stateful so typing and spinners really change value. */
export default { title: "Primitives/NumberField" };

const Live = ({
  label = "Volatility:",
  initial = 0.1,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
  invalid = false,
  error,
}: {
  label?: string;
  initial?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
}): ReactElement => {
  const [value, setValue] = useState(initial);
  return (
    <NumberField
      label={label}
      value={value}
      onChange={setValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      invalid={invalid}
      error={error}
    />
  );
};

export const Default = (): ReactElement => <Live />;
/** Same as Default; the visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
export const Disabled = (): ReactElement => <Live disabled />;
export const Invalid = (): ReactElement => (
  <Live initial={4} invalid error="Volatility must be between 0 and 1." />
);
export const LongText = (): ReactElement => (
  <Live
    label="Number of samples drawn per simulation run (more is slower)"
    initial={1000}
    min={1}
    max={10000}
    step={1}
  />
);
/** A label carrying the engine's emoji walk: drawn by LabelGlyphs; the accessible name keeps the exact string. */
export const EmojiLabel = (): ReactElement => <Live label="🟢🟢🟢🔴 volatility:" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
