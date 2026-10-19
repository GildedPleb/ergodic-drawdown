import type { ReactElement } from "react";
import { useState } from "react";

import { RadioList } from "./RadioList";

/** Plain CSF 3. Stateful so clicks and arrow keys really select. */
export default { title: "Primitives/RadioList" };

const WALKS = ["Bubble", "Momentum", "Pong", "Random", "\u{1F7E2}\u{1F7E2}\u{1F7E2}\u{1F534}"];

const Live = ({ options = WALKS }: { options?: readonly string[] }): ReactElement => {
  const [value, setValue] = useState(options[0] ?? "");
  return (
    <div>
      <span id="radio-story-label">Walk Strategy:</span>
      <RadioList
        labelledBy="radio-story-label"
        options={options}
        value={value}
        onChange={setValue}
      />
    </div>
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
export const LongText = (): ReactElement => (
  <Live
    options={[
      "Power Law Regression Median",
      "An option name long enough to wrap onto a second line in a narrow pane",
    ]}
  />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
