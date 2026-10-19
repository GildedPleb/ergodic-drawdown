import type { ReactElement } from "react";

import { Stack } from "./Stack";

export default { title: "Primitives/Stack" };

export const Default = (): ReactElement => (
  <Stack>
    <span>One</span>
    <span>Two</span>
  </Stack>
);
export const Focus = (): ReactElement => (
  <Stack>
    <span>One</span>
    <span>Two</span>
  </Stack>
);
export const LongText = (): ReactElement => (
  <Stack>
    <span>
      A longer line that should wrap to two lines before truncating in constrained layouts.
    </span>
  </Stack>
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Stack pad>
      <span>Linen theme</span>
    </Stack>
  </div>
);
