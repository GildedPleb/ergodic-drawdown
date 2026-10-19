import type { JSX } from "react";

import { Stack } from "../../design/primitives/Stack";
import { Amount } from "../../design/primitives/Amount";
import { TickToggle } from "../../design/primitives/TickToggle";
import styles from "./DesignRoute.module.css";

const STORIES: Record<string, () => JSX.Element> = {
  "tick-row": () => <TickToggle label="Compare" checked={false} />,
  "tick-toggle": () => <TickToggle label="Compare" checked={false} />,
  "tick-toggle-default": () => <TickToggle label="Compare" checked={false} />,
  "tick-toggle-on": () => <TickToggle label="Compare" checked />,
  "tick-toggle-off": () => <TickToggle label="Compare" checked={false} />,
  "tick-toggle-disabled": () => <TickToggle label="Compare" checked={false} disabled />,
  "amount-btc": () => <Amount value={13.1} unit="btc" />,
  "tick-toggle-linen": () => (
    <div data-theme="linen">
      <TickToggle label="Compare" checked />
    </div>
  ),
};

/** /design/:story ground truth. Playwright targets this, not Storybook. */
export const DesignRoute = ({ story }: { story: string }): JSX.Element => {
  const main = styles["main"] ?? "design-main";
  const render = STORIES[story];
  if (render === undefined) {
    return (
      <main className={main}>
        <p>No story: {story}</p>
      </main>
    );
  }
  return (
    <main className={main}>
      <Stack>{render()}</Stack>
    </main>
  );
};
