import type { ReactElement } from "react";
import { useState } from "react";

import { Select } from "./Select";

/** Plain CSF 3. Stateful so a pick really changes the value. */
export default { title: "Primitives/Select" };

const MODELS = [
  "Power Law Regression Median",
  "Power Law Support Line",
  "Rainbow Chart",
  "CAGR",
  "Stock-To-Flow 2024 Refit",
  "Stock-To-Flow",
  "Historic",
];
const WALKS = [
  "Bubble",
  "Momentum",
  "Pong",
  "Random",
  "Saw",
  "Shark",
  "Sin",
  "Vote Count",
  "🟢🟢🟢🔴",
];

const Live = ({
  options = MODELS,
  start = MODELS[0] ?? "",
  columns = false,
}: {
  options?: string[];
  start?: string;
  columns?: boolean;
}): ReactElement => {
  const [value, setValue] = useState(start);
  return (
    <div>
      <span id="story-select-label">Price model</span>
      <Select
        id="story-select"
        labelledBy="story-select-label"
        options={options}
        value={value}
        describe={(o) => `What ${o} does, in one short line.`}
        columns={columns}
        onChange={setValue}
      />
    </div>
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live start="CAGR" />;
/** The visual matrix opens it (Tab, Enter) before axe and the screenshot. */
export const Open = (): ReactElement => <Live start="CAGR" />;
/** The walk list: nine options (scrolls past 7) and the 🟢🔴 label drawn as SVG. */
export const LongText = (): ReactElement => <Live options={WALKS} start="🟢🟢🟢🔴" />;
/** Desktop: the open walk list in two columns. */
export const Columns = (): ReactElement => <Live options={WALKS} start="Bubble" columns />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
