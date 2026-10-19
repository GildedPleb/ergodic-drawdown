import type { ReactElement } from "react";

import { TickToggle } from "../TickToggle";
import { Grid } from "./Grid";

/** Plain CSF 3, no Storybook/Ladle imports. Focus demos use real 44px controls (Form nit). */
export default { title: "Layout/Grid" };

export const Default = (): ReactElement => (
  <Grid>
    <span>One</span>
    <span>Two</span>
    <span>Three</span>
  </Grid>
);
export const Focus = (): ReactElement => (
  <Grid gap="1">
    <TickToggle label="One" checked={false} />
    <TickToggle label="Two" checked />
  </Grid>
);
export const LongText = (): ReactElement => (
  <Grid gap="6">
    <span>
      A longer line that should wrap to two lines before truncating in constrained layouts.
    </span>
    <span>Two</span>
  </Grid>
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Grid gap="4">
      <span>One</span>
      <span>Two</span>
      <span>Three</span>
    </Grid>
  </div>
);
