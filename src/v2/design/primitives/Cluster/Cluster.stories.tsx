import type { ReactElement } from "react";

import { TickToggle } from "../TickToggle";
import { Cluster } from "./Cluster";

/** Plain CSF 3, no Storybook/Ladle imports. Focus demos use real 44px controls (Form nit). */
export default { title: "Layout/Cluster" };

export const Default = (): ReactElement => (
  <Cluster>
    <span>One</span>
    <span>Two</span>
    <span>Three</span>
  </Cluster>
);
export const Focus = (): ReactElement => (
  <Cluster gap="1">
    <TickToggle label="One" checked={false} />
    <TickToggle label="Two" checked />
  </Cluster>
);
export const LongText = (): ReactElement => (
  <Cluster gap="6">
    <span>
      A longer line that should wrap to two lines before truncating in constrained layouts.
    </span>
    <span>Two</span>
  </Cluster>
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Cluster gap="4">
      <span>One</span>
      <span>Two</span>
      <span>Three</span>
    </Cluster>
  </div>
);
