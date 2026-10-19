import type { ReactElement } from "react";
import { useState } from "react";

import { Select } from "./Select";

/** Plain CSF 3, no Storybook/Ladle imports. Stateful so the native picker really changes value. */
export default { title: "Primitives/Select" };

const WALKS = ["Bubble", "Random", "Vote Count", "🟢🟢🟢🔴"] as const;

const Live = ({
  label = "Walk Strategy:",
  initial = "Bubble",
  options = WALKS,
  disabled = false,
  invalid = false,
  error,
  labelVisibility = "visible",
}: {
  label?: string;
  initial?: string;
  options?: readonly string[];
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
  labelVisibility?: "visible" | "hidden";
}): ReactElement => {
  const [value, setValue] = useState(initial);
  return (
    <Select
      label={label}
      labelVisibility={labelVisibility}
      options={options}
      value={value}
      onChange={setValue}
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
  <Live invalid error="Choose a walk the engine supports." />
);
export const LongText = (): ReactElement => (
  <Live
    label="A much longer control label that has to wrap before the field"
    options={["Power Law Regression Median", "Stock-to-Flow (S2F) with a long option name"]}
    initial="Power Law Regression Median"
  />
);
export const HiddenLabel = (): ReactElement => (
  <Live label="Price model" labelVisibility="hidden" />
);
/** The engine's emoji walk: drawn by LabelGlyphs; the option and accessible value stay "🟢🟢🟢🔴". */
export const EmojiLabel = (): ReactElement => <Live initial="🟢🟢🟢🔴" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live initial="🟢🟢🟢🔴" />
  </div>
);
