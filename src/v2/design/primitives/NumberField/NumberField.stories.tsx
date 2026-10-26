import type { ReactElement } from "react";
import { useState } from "react";

import { NumberField } from "./NumberField";

/** Plain CSF 3, no Storybook imports. Stateful so Enter, blur and arrow keys really commit. */
export default { title: "Primitives/NumberField" };

const VOLATILITY = { min: 0, max: 1 };
const limit = (used: number, b: { max: number }): string =>
  `${used === b.max ? "Max" : "Min"} is ${String(used)}`;
/** Form Storybook ruling: the real short note (2j), never the retired long message. */
const invalid = (): string => "Numbers only";

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
      limitNote={limit}
      wholeMessage="Whole numbers only"
      dotMessage="Use a dot for decimals"
      invalidMessage={invalid}
      largeMessage="Too large"
      emptyMessage="Enter a number"
      hint={hint}
      initialText={typed}
    />
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live hint="(~40 years)" />;
export const Disabled = (): ReactElement => <Live disabled />;
/** "abc": ⚠, --invalid text and a strong rule in --invalid, and the short note "Numbers only". */
export const Invalid = (): ReactElement => <Live typed="abc" />;
/** "4" in a 0–1 field: clamped to 1 with the short note "Max is 1" (Form 4e). */
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
