import type { ReactElement } from "react";

import { SectionLabel } from "./SectionLabel";

/** Plain CSF 3. Not focusable, so no Focus story. */
export default { title: "Primitives/SectionLabel" };

export const Default = (): ReactElement => <SectionLabel text="Model" />;
export const Group = (): ReactElement => <SectionLabel text="Clamp Price:" level="group" />;
export const LongText = (): ReactElement => (
  <SectionLabel text="A longer section title that wraps on a phone" />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <SectionLabel text="Model" />
  </div>
);
