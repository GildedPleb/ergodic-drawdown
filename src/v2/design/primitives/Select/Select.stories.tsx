import type { ReactElement } from "react";
import { useState } from "react";

import { Select } from "./Select";

/**
 * Plain CSF 3, no Storybook/Ladle imports. Stateful so the native picker really changes value.
 *
 * Font exception (Form + Keel): the closed face draws emoji labels as SVG through LabelGlyphs and is
 * held to the strict SM-only font check. The OPEN native picker is OS chrome: its option list may
 * show the system emoji for "🟢🟢🟢🔴". The font check exempts the native <select>/<option> subtree
 * only (transparent when closed). This is the only exception (TOKENS.md).
 */
export default { title: "Primitives/Select" };

const WALKS = ["Bubble", "Momentum", "Vote Count", "🟢🟢🟢🔴"] as const;

const Live = ({
  label = "Walk Strategy:",
  initial = "Bubble",
  options = WALKS,
  disabled = false,
  invalid = false,
  error,
}: {
  label?: string;
  initial?: string;
  options?: readonly string[];
  disabled?: boolean;
  invalid?: boolean;
  error?: string;
}): ReactElement => {
  const [value, setValue] = useState(initial);
  return (
    <Select
      label={label}
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
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live initial="Vote Count" />;
export const Disabled = (): ReactElement => <Live disabled />;
export const Invalid = (): ReactElement => (
  <Live invalid error="That walk isn't available. Pick one from the list." />
);
export const LongText = (): ReactElement => (
  <Live
    label="A much longer control label that has to wrap before the field"
    options={["Power Law Regression Median", "Stock-To-Flow 2024 Refit"]}
    initial="Power Law Regression Median"
  />
);
/** Labelled by visible text elsewhere (here a heading), never by invented hidden wording (m4). */
export const LabelledByHeading = (): ReactElement => {
  const [value, setValue] = useState("Power Law Regression Median");
  return (
    <section>
      <h2 id="story-model-heading">Model</h2>
      <Select
        labelledBy="story-model-heading"
        options={["Power Law Regression Median", "CAGR", "Historic"]}
        value={value}
        onChange={setValue}
      />
    </section>
  );
};
/** The engine's emoji walk selected: SVG circles in the face; the option and value stay exact. */
export const EmojiLabel = (): ReactElement => <Live initial="🟢🟢🟢🔴" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live initial="🟢🟢🟢🔴" />
  </div>
);
