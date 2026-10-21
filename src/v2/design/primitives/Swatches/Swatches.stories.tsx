import type { ReactElement } from "react";
import { useState } from "react";

import { Swatches } from "./Swatches";

/** Plain CSF 3. Stateful so a pick really moves. Fixed set of chips, so no LongText story. */
export default { title: "Primitives/Swatches" };

const COLOURS = [
  { name: "\u20BF orange", colour: "var(--path-btc-price)" },
  { name: "Jade", colour: "var(--path-plan-1)" },
  { name: "Lapis", colour: "var(--path-plan-2)" },
  { name: "Amethyst", colour: "var(--path-plan-3)" },
  { name: "Citron", colour: "var(--path-plan-4)" },
  { name: "Orchid", colour: "var(--path-plan-5)" },
  { name: "Coral", colour: "var(--path-plan-6)" },
  { name: "$ green", colour: "var(--path-usd)" },
];

const Live = (): ReactElement => {
  const [value, setValue] = useState(COLOURS[0]?.name ?? "");
  return (
    <div>
      <span id="story-swatches">Colour</span>
      <Swatches labelledBy="story-swatches" options={COLOURS} value={value} onChange={setValue} />
    </div>
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
