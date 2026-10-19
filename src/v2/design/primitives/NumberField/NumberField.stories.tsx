import type { ReactElement } from "react";
import { useState } from "react";

import { NumberField, type NumberRule } from "./NumberField";

/** Plain CSF 3, no Storybook/Ladle imports. Stateful so typing and arrow keys really commit. */
export default { title: "Primitives/NumberField" };

const VOLATILITY: NumberRule = { kind: "settle", accept: (n) => n >= 0 && n <= 1 };
const volatilityError = (current: number): string =>
  `Volatility goes from 0 to 1. Enter a number in that range. Your last value, ${current}, is still in use.`;

const Live = ({
  label = "Volatility (0-1):",
  initial = 0.1,
  draft,
  disabled = false,
  hint,
}: {
  label?: string;
  initial?: number;
  /** Text typed after mount (e.g. an out-of-range value for the Invalid story). */
  draft?: string;
  disabled?: boolean;
  hint?: string;
}): ReactElement => {
  const [value, setValue] = useState(initial);
  return (
    <NumberField
      label={label}
      value={value}
      onCommit={setValue}
      rule={VOLATILITY}
      min={0}
      max={1}
      step={0.005}
      disabled={disabled}
      error={volatilityError}
      hint={hint}
      initialText={draft}
    />
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live hint="(~40 years)" />;
export const Disabled = (): ReactElement => <Live disabled />;
/** The state a rejected draft (e.g. "4") shows: ⚠, a strong rule in --invalid, cause + next step. */
export const Invalid = (): ReactElement => <Live draft="4" />;
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
