import type { ReactElement } from "react";
import { useState } from "react";

import { Dock, type DockTab } from "./Dock";

/** Plain CSF 3. Slice 1: only MODELS is shown; the other slots keep their boxes, hidden. */
export default { title: "Primitives/Dock" };

const TABS: DockTab[] = [
  { id: "models", label: "Models", shown: true },
  { id: "plans", label: "Plans", shown: false },
  { id: "stats", label: "Stats", shown: false },
];

const Live = ({
  orientation = "row",
  tabs = TABS,
}: {
  orientation?: "row" | "rail";
  tabs?: DockTab[];
}): ReactElement => {
  const [open, setOpen] = useState(false);
  return (
    <Dock
      orientation={orientation}
      label="Panes"
      tabs={tabs}
      selected="models"
      expanded={open}
      onTab={() => {
        setOpen((o) => !o);
      }}
      search={{ label: "Search", shown: false }}
      settings={{ label: "Settings", shown: false }}
    />
  );
};

export const Default = (): ReactElement => <Live />;
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Live />;
export const Rail = (): ReactElement => <Live orientation="rail" />;
export const LongText = (): ReactElement => (
  <Live tabs={[{ id: "models", label: "Models and assumptions", shown: true }, ...TABS.slice(1)]} />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Live />
  </div>
);
