import type { Preview } from "@storybook/react";

import "../src/v2/design/base/base.css";
import "../src/v2/design/tokens/tokens.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    backgrounds: { disable: true },
  },
};

export default preview;
