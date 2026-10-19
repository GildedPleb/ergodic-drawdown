import type { JSX } from "react";
import { useEffect } from "react";

import { ModelsPane } from "../../app/models";
import * as AmountStories from "../../design/primitives/Amount/Amount.stories";
import * as ClusterStories from "../../design/primitives/Cluster/Cluster.stories";
import * as GridStories from "../../design/primitives/Grid/Grid.stories";
import * as IconStories from "../../design/primitives/Icon/Icon.stories";
import * as LabelGlyphsStories from "../../design/primitives/LabelGlyphs/LabelGlyphs.stories";
import * as NumberFieldStories from "../../design/primitives/NumberField/NumberField.stories";
import * as SectionLabelStories from "../../design/primitives/SectionLabel/SectionLabel.stories";
import * as SelectStories from "../../design/primitives/Select/Select.stories";
import * as StackStories from "../../design/primitives/Stack/Stack.stories";
import * as TickToggleStories from "../../design/primitives/TickToggle/TickToggle.stories";
import { VisuallyHidden } from "../../design/primitives/VisuallyHidden";
import * as VisuallyHiddenStories from "../../design/primitives/VisuallyHidden/VisuallyHidden.stories";
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
  "section-label": SectionLabelStories,
  select: SelectStories,
  stack: StackStories,
  "tick-toggle": TickToggleStories,
  "visually-hidden": VisuallyHiddenStories,
};

/** Contract aliases (MVP-SPEC P0.10 uses /design/tick-row/<state>). */
const ALIASES: Record<string, string> = { "tick-row": "tick-toggle" };

const STORIES = new Map<string, Story>([
  ["models-pane", () => <ModelsPane />],
  ["models-pane/default", () => <ModelsPane />],
  // B2: the engine's emoji walk selected; the fonts check must see no emoji text node.
  ["models-pane/emoji-walk", () => <ModelsPane initial={{ walk: "🟢🟢🟢🔴" }} />],
  // Probe m3: the pane in linen (the …/linen suffix themes <html>).
  ["models-pane/linen", () => <ModelsPane />],
]);
for (const [group, mod] of Object.entries(GROUPS)) {
  for (const [name, value] of Object.entries(mod)) {
    if (name === "default" || !isStory(value)) continue;
    STORIES.set(`${group}/${kebab(name)}`, value);
    if (name === "Default") STORIES.set(group, value);
  }
}

export const storyIds = (): string[] => [...STORIES.keys()].toSorted();

const resolve = (id: string): Story | undefined => {
  const parts = id.split("/");
  if (parts.length > 2 || parts.some((p) => p === "")) return undefined;
  const [group = "", rest] = parts;
  const real = ALIASES[group] ?? group;
  return STORIES.get(rest === undefined ? real : `${real}/${rest}`);
};

/** /design/:group[/:story] ground truth. Playwright targets this, not Storybook. */
export const DesignRoute = ({ story }: { story: string }): JSX.Element => {
  const main = styles["main"] ?? "design-main";
  const render = resolve(story);
  // `…/linen` stories, or any story with ?theme=linen (the visual matrix shoots both themes).
  const linen =
    story.endsWith("/linen") ||
    new URLSearchParams(window.location.search).get("theme") === "linen";
  useEffect(() => {
    // Themes apply on <html> so the page ground matches the story (m4).
    document.documentElement.dataset["theme"] = linen ? "linen" : "dark";
  }, [linen]);
  if (story === "") {
    // Bare /design: the story index.
    return (
      <main className={main} data-story="">
        <h1>Design stories</h1>
        <ul>
          {storyIds().map((id) => (
            <li key={id}>
              <a href={`/design/${id}`}>{id}</a>
            </li>
          ))}
        </ul>
      </main>
    );
  }
  if (render === undefined) {
    return (
      <main className={main}>
        <h1>No story: {story}</h1>
      </main>
    );
  }
  const Render = render;
  return (
    <main className={main} data-story={story}>
      {/* Form nit: every story page has one h1 (screen-reader only). */}
      <VisuallyHidden as="h1">{`Design story: ${story}`}</VisuallyHidden>
      <Render />
    </main>
  );
};
