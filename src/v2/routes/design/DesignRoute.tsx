import type { JSX } from "react";
import { useEffect, useState } from "react";

import { ModelsSheet } from "../../app/models/ModelsSheet";
import { defaultModelsValues, type ModelsValues } from "../../app/models/values";
import * as AmountStories from "../../design/primitives/Amount/Amount.stories";

import * as ClusterStories from "../../design/primitives/Cluster/Cluster.stories";
import * as DockStories from "../../design/primitives/Dock/Dock.stories";
import * as GrabPointStories from "../../design/primitives/GrabPoint/GrabPoint.stories";
import * as GridStories from "../../design/primitives/Grid/Grid.stories";
import * as IconStories from "../../design/primitives/Icon/Icon.stories";
import * as LabelGlyphsStories from "../../design/primitives/LabelGlyphs/LabelGlyphs.stories";
import * as LedgerRowStories from "../../design/primitives/LedgerRow/LedgerRow.stories";
import * as NumberFieldStories from "../../design/primitives/NumberField/NumberField.stories";
import * as SelectStories from "../../design/primitives/Select/Select.stories";
import * as SectionLabelStories from "../../design/primitives/SectionLabel/SectionLabel.stories";
import * as SliderStories from "../../design/primitives/Slider/Slider.stories";
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
  dock: DockStories,
  "grab-point": GrabPointStories,
  grid: GridStories,
  icon: IconStories,
  "label-glyphs": LabelGlyphsStories,
  "ledger-row": LedgerRowStories,
  "number-field": NumberFieldStories,
  "section-label": SectionLabelStories,
  select: SelectStories,
  slider: SliderStories,
  stack: StackStories,
  "tick-toggle": TickToggleStories,
  "visually-hidden": VisuallyHiddenStories,
};

/** Contract aliases (MVP-SPEC P0.10 uses /design/tick-row/<state>). */
const ALIASES: Record<string, string> = { "tick-row": "tick-toggle" };

/** The Models sheet with live state (no engine): every control really commits. */
const Sheet = ({
  initial,
  open = "bitcoin",
}: {
  initial?: Partial<ModelsValues>;
  /** §1M: the row open on landing in the story (the app lands with every row closed). */
  open?: string | null;
}): JSX.Element => {
  const [values, setValues] = useState<ModelsValues>(() => ({
    ...defaultModelsValues(),
    ...initial,
  }));
  const [on, setOn] = useState(true);
  return (
    <ModelsSheet
      initialOpen={open}
      on={on}
      onOn={setOn}
      values={values}
      onChange={(patch) => {
        setValues((v) => ({ ...v, ...patch }));
      }}
    />
  );
};

const STORIES = new Map<string, Story>([
  ["models-sheet", () => <Sheet />],
  ["models-sheet/default", () => <Sheet />],
  // B2: the engine's emoji walk selected; the fonts check must see no emoji text node.
  ["models-sheet/emoji-walk", () => <Sheet initial={{ walk: "🟢🟢🟢🔴" }} />],
  // Probe m3: the sheet in linen (the …/linen suffix themes <html>).
  ["models-sheet/linen", () => <Sheet />],
  // §1N: CAGR's tray, and a value cell editing in place.
  ["models-sheet/cagr", () => <Sheet initial={{ model: "CAGR", variable: 20 }} />],
  // §1P: no edit mode; the matrix focuses the live value cell (CAGR: R (%) and its focus slider).
  ["models-sheet/editing", () => <Sheet initial={{ model: "CAGR", variable: 20 }} />],
  // §1M/§1V: the ledger as it lands (every row closed), and a stand-in open.
  ["models-sheet/collapsed", () => <Sheet open={null} />],
  ["models-sheet/sp", () => <Sheet open="sp" />],
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
