import type { JSX, KeyboardEvent } from "react";

import { Icon } from "../Icon";
import styles from "./Dock.module.css";

/** R7: variant keys and values. */
export const variants = {
  orientation: ["row", "rail", "columns"] as const,
  shown: ["false"] as const,
  selected: ["true"] as const,
};

export type DockTab = {
  id: string;
  label: string;
  /** false: the slot keeps its box (visibility:hidden) but is out of focus and the a11y tree. */
  shown: boolean;
  /** id of the panel this tab controls. */
  controls?: string | undefined;
};

export type DockProps = {
  orientation: (typeof variants.orientation)[number];
  /** tablist name. */
  label: string;
  tabs: readonly DockTab[];
  selected: string;
  onTab?: (id: string) => void;
  search: { label: string; shown: boolean };
  settings: { label: string; shown: boolean };
  /** Expanded state of what the selected tab opens (the sheet or the panel). */
  expanded?: boolean | undefined;
};

const blockRepeat = (event: KeyboardEvent<HTMLButtonElement>): void => {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
};

/**
 * The dock row (V32-BUILD §1d): 🔍 · centred caps tabs · ⚙, or the closed right-panel rail
 * (§1e). Every slot always renders so the geometry is final; slots not shipped yet are
 * visibility:hidden, never dimmed or "coming soon". The selected tab is --accent with a 2px
 * underline drawn by a pseudo-element (no box-shadow, R4). §1S "columns": the sheet's three
 * columns; each tab is centred over its own one, 🔍 and ⚙ at the far ends.
 */
export const Dock = ({
  orientation,
  label,
  tabs,
  selected,
  onTab,
  search,
  settings,
  expanded,
}: DockProps): JSX.Element => {
  const root = styles["root"] ?? "dock-root";
  const list = styles["tabs"] ?? "dock-tabs";
  const tab = styles["tab"] ?? "dock-tab";
  const mag = styles["mag"] ?? "dock-mag";
  const gear = styles["gear"] ?? "dock-gear";

  return (
    <div className={root} data-orientation={orientation}>
      <button
        type="button"
        className={mag}
        aria-label={search.label}
        data-shown={search.shown ? undefined : "false"}
        tabIndex={search.shown ? 0 : -1}
      >
        <Icon name="search" />
      </button>
      <div
        className={list}
        role="tablist"
        aria-label={label}
        aria-orientation={orientation === "rail" ? "vertical" : "horizontal"}
      >
        {tabs.map((t) => {
          const on = t.id === selected;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              className={tab}
              aria-selected={on}
              aria-controls={t.controls}
              aria-expanded={on ? expanded : undefined}
              tabIndex={on && t.shown ? 0 : -1}
              data-shown={t.shown ? undefined : "false"}
              data-selected={on ? "true" : undefined}
              onKeyDown={blockRepeat}
              onClick={() => {
                onTab?.(t.id);
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={gear}
        aria-label={settings.label}
        data-shown={settings.shown ? undefined : "false"}
        tabIndex={settings.shown ? 0 : -1}
      >
        <Icon name="gear" />
      </button>
    </div>
  );
};
