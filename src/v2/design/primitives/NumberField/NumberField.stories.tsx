import type { ReactElement } from "react";
import { useState } from "react";

import { NumberField } from "./NumberField";

/** Plain CSF 3, no Storybook imports. Stateful so Enter, blur and arrow keys really commit. */
export default { title: "Primitives/NumberField" };

const VOLATILITY = { min: 0, max: 1 };
const clamped = (used: number): string => `Volatility goes from 0 to 1. We used ${used}.`;
const invalid = (current: number): string =>
  `Volatility takes a number from 0 to 1. Your last value, ${current}, is still in use.`;

const Live = ({
  label = "Volatility (0-1):",
  initial = 0.1,
  typed,
  disabled = false,
  hint,
}: {
  label?: string;
  initial?: number;
  /** Text typed and committed after mount (the Invalid story). */
  typed?: string;
  disabled?: boolean;
  hint?: string;
}): ReactElement => {
  const [value, setValue] = useState(initial);
  return (
    <NumberField
      label={label}
      value={value}
      onCommit={setValue}
      bounds={VOLATILITY}
      step={0.005}
      disabled={disabled}
      clampMessage={clamped}
      invalidMessage={invalid}
      hint={hint}
      initialText={typed}
    />
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live hint="(~40 years)" />;
export const Disabled = (): ReactElement => <Live disabled />;
/** "abc": ⚠, --invalid text and a strong rule in --invalid, cause → what to enter → reassurance. */
export const Invalid = (): ReactElement => <Live typed="abc" />;
/** "4" in a 0–1 field: clamped to 1 with a visible message. */
export const Clamped = (): ReactElement => <Live typed="4" />;
export const LongText = (): ReactElement => (
  <Live
    label="Statistical Sample Count (1k-10k): the label wraps before the field"
    initial={1000}
  />
);
/** A label carrying the engine's emoji walk: SVG circles, role=img named with the exact string. */
export const EmojiLabel = (): ReactElement => <Live label="🟢🟢🟢🔴 volatility:" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live hint="(~40 years)" />
  </div>
);
