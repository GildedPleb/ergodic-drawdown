import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/v2/**/*.stories.@(ts|tsx)"],
  addons: [],
  core: { disableTelemetry: true },
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    // Stay on the project's Vite 8. Do not inject a second bundler.
    config.plugins = config.plugins ?? [];
    return config;
  },
};

export default config;
