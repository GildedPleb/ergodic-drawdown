import type { ReactElement } from "react";

import { Stack } from "./Stack";

/** Plain CSF 3, no Storybook/Ladle imports. */
export default { title: "Layout/Stack" };

export const Default = (): ReactElement => (
  <Stack>
    <span>One</span>
    <span>Two</span>
    <span>Three</span>
  </Stack>
);
export const Focus = (): ReactElement => (
  <Stack gap="1">
    <button type="button">One</button>
    <button type="button">Two</button>
  </Stack>
);
export const LongText = (): ReactElement => (
  <Stack gap="6">
    <span>
      A longer line that should wrap to two lines before truncating in constrained layouts.
    </span>
    <span>Two</span>
  </Stack>
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Stack gap="4">
      <span>One</span>
      <span>Two</span>
      <span>Three</span>
    </Stack>
  </div>
);
