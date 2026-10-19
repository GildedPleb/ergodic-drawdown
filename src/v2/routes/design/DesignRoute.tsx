import type { JSX } from "react";
import { useEffect } from "react";

import { ModelsPane } from "../../app/models";
import * as AmountStories from "../../design/primitives/Amount/Amount.stories";
import * as ClusterStories from "../../design/primitives/Cluster/Cluster.stories";
import * as GridStories from "../../design/primitives/Grid/Grid.stories";
import * as IconStories from "../../design/primitives/Icon/Icon.stories";
import * as LabelGlyphsStories from "../../design/primitives/LabelGlyphs/LabelGlyphs.stories";
import * as NumberFieldStories from "../../design/primitives/NumberField/NumberField.stories";
import * as SelectStories from "../../design/primitives/Select/Select.stories";
import * as StackStories from "../../design/primitives/Stack/Stack.stories";
import * as TickToggleStories from "../../design/primitives/TickToggle/TickToggle.stories";
import styles from "./DesignRoute.module.css";

type Story = () => JSX.Element;
type StoryModule = Record<string, unknown>;

const isStory = (value: unknown): value is Story => typeof value === "function";

const kebab = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** The same CSF exports Storybook renders, so /design and the gallery cannot drift. */
const GROUPS: Record<string, StoryModule> = {
  amount: AmountStories,
  cluster: ClusterStories,
  grid: GridStories,
  icon: IconStories,
  "label-glyphs": LabelGlyphsStories,
  "number-field": NumberFieldStories,
  select: SelectStories,
  stack: StackStories,
  "tick-toggle": TickToggleStories,
};

/** Contract aliases (MVP-SPEC P0.10 uses /design/tick-row/<state>). */
const ALIASES: Record<string, string> = { "tick-row": "tick-toggle" };

const STORIES = new Map<string, Story>([["models-pane", () => <ModelsPane />]]);
for (const [group, mod] of Object.entries(GROUPS)) {
  for (const [name, value] of Object.entries(mod)) {
    if (name === "default" || !isStory(value)) continue;
    STORIES.set(`${group}/${kebab(name)}`, value);
    if (name === "Default") STORIES.set(group, value);
  }
}

export const storyIds = (): string[] => [...STORIES.keys()].toSorted();

const resolve = (id: string): Story | undefined => {
  const [group = "", rest] = id.split("/", 2);
  const real = ALIASES[group] ?? group;
  return STORIES.get(rest === undefined ? real : `${real}/${rest}`);
};

/** /design/:group[/:story] ground truth. Playwright targets this, not Storybook. */
export const DesignRoute = ({ story }: { story: string }): JSX.Element => {
  const main = styles["main"] ?? "design-main";
  const render = resolve(story);
  const linen = story.endsWith("/linen");
  useEffect(() => {
    // Themes apply on <html> so the page ground matches the story (m4).
    document.documentElement.dataset["theme"] = linen ? "linen" : "dark";
  }, [linen]);
  if (render === undefined) {
    return (
      <main className={main}>
        <p>No story: {story}</p>
      </main>
    );
  }
  const Render = render;
  return (
    <main className={main} data-story={story}>
      <Render />
    </main>
  );
};
