import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { Dock, type DockTab } from "../../design/primitives/Dock";
import { FanDiamond, GrabPoint } from "../../design/primitives/GrabPoint";
import { useWorld } from "../engine/useWorld";
import { ModelsSheet } from "../models/ModelsSheet";
import { defaultModelsValues, type ModelsValues } from "../models/values";
import { strings } from "../strings";
import { endValue } from "../world/bands";
import { endYear } from "../world/geometry";
import { WorldLayer } from "../world/WorldLayer";
import styles from "./AppShell.module.css";
import { SIDE_PANEL, useMedia } from "./useMedia";

/** R7: variant keys and values. */
export const variants = {
  sheet: ["half", "open"] as const,
  column: ["open", "closed"] as const,
  corner: ["start", "end"] as const,
};

const SHEET_ID = "models-sheet";
const TABS: DockTab[] = [
  { id: "models", label: strings.dock.models, shown: true, controls: SHEET_ID },
  { id: "plans", label: strings.dock.plans, shown: false },
  { id: "stats", label: strings.dock.stats, shown: false },
];
const HIDDEN = { shown: false } as const;

/**
 * Slice 1 shell (V32-BUILD §1a, §1c–§1e): header, headline, the world layer, and the Models
 * sheet: a bottom sheet (half / open) on phones and desktops, a right panel (rail / open) in
 * phone landscape. Only MODELS is shown in the dock; every other slot keeps its box, hidden.
 */
export const AppShell = (): JSX.Element => {
  const [now] = useState(() => Date.now());
  const [values, setValues] = useState<ModelsValues>(defaultModelsValues);
  const [open, setOpen] = useState(false);
  // The chart column reflows once, when the panel has finished sliding in (§1e).
  const [column, setColumn] = useState(false);
  const side = useMedia(SIDE_PANEL);
  const sheet = useRef<HTMLElement>(null);
  const world = useWorld(values, now);

  const { bands } = world;
  const ends =
    bands === null
      ? null
      : ([
          endValue(bands.p50),
          endYear(now, bands.weeks),
          endValue(bands.p5),
          endValue(bands.p95),
        ] as const);
  const sentence = ends === null ? strings.headline.pending : strings.headline.sentence(...ends);
  const spoken = ends === null ? strings.headline.pending : strings.headline.spoken(...ends);

  const setSheet = (next: boolean): void => {
    setOpen(next);
    if (!next) setColumn(false);
  };

  useEffect(() => {
    if (!side || !open) return undefined;
    // Opening the panel moves focus into it (§1i); the column reflow waits for the slide.
    sheet.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    const done = window.setTimeout(() => {
      setColumn(true);
    }, 400);
    return () => {
      window.clearTimeout(done);
    };
  }, [side, open]);

  // Esc closes the sheet or panel (a row editor stops its own Esc first) and returns focus to
  // the tab (§1i). A document listener: feature code puts no key handlers on plain elements (G4).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setOpen(false);
      setColumn(false);
      document.getElementById("tab-models")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const root = styles["root"] ?? "shell-root";
  const columnCls = styles["column"] ?? "shell-column";
  const header = styles["header"] ?? "shell-header";
  const headerRow = styles["headerRow"] ?? "shell-header-row";
  const logo = styles["logo"] ?? "shell-logo";
  const mark = styles["mark"] ?? "shell-mark";
  const math = styles["math"] ?? "shell-math";
  const top = styles["top"] ?? "shell-top";
  const title = styles["title"] ?? "shell-title";
  const kicker = styles["kicker"] ?? "shell-kicker";
  const dh = styles["dh"] ?? "shell-dh";
  const chart = styles["chart"] ?? "shell-chart";
  const dockArea = styles["dockArea"] ?? "shell-dock-area";
  const sheetCls = styles["sheet"] ?? "shell-sheet";
  const corner = styles["corner"] ?? "shell-corner";
  const grab = styles["grab"] ?? "shell-grab";
  const beat = styles["beat"] ?? "shell-beat";
  const beatText = styles["beatText"] ?? "shell-beat-text";
  const slot = styles["slot"] ?? "shell-slot";
  const dockRow = styles["dockRow"] ?? "shell-dock-row";
  const heading = styles["heading"] ?? "shell-heading";
  const body = styles["body"] ?? "shell-body";
  const cols = styles["cols"] ?? "shell-cols";
  const col = styles["col"] ?? "shell-col";

  const sheetState: (typeof variants.sheet)[number] = open ? "open" : "half";
  const columnState: (typeof variants.column)[number] = side && column ? "open" : "closed";

  return (
    <div className={root} data-sheet={sheetState} data-column={columnState}>
      <main className={columnCls}>
        <header className={header}>
          <div className={headerRow}>
            <span className={logo}>
              <span className={mark}>
                <FanDiamond />
              </span>
              <span>
                {strings.brand.stack}
                <b className={math}>{strings.brand.math}</b>
              </span>
            </span>
          </div>
        </header>
        <div className={top}>
          <p className={kicker}>{strings.headline.kicker(values.samples, values.model)}</p>
          {/* One h1 at every size: the phone title, or the sentence where the headline shows. */}
          <h1 className={heading}>
            <span className={title}>{strings.headline.phoneTitle}</span>
            <span className={dh}>{sentence}</span>
          </h1>
        </div>
        <div className={chart}>
          <WorldLayer bands={bands} now={now} horizon={world.horizon} label={spoken} />
        </div>
      </main>
      <div className={dockArea}>
        <section ref={sheet} id={SHEET_ID} className={sheetCls} aria-label={strings.dock.models}>
          <span className={corner} data-corner="start" aria-hidden="true" />
          <span className={corner} data-corner="end" aria-hidden="true" />
          <div className={beat}>
            <p className={beatText}>{sentence}</p>
            <span className={slot} aria-hidden="true" />
          </div>
          <div className={dockRow}>
            <Dock
              orientation={side && !open ? "rail" : "row"}
              label={strings.dock.label}
              tabs={TABS}
              selected="models"
              expanded={open}
              onTab={() => {
                setSheet(!open);
              }}
              search={{ label: strings.dock.search, ...HIDDEN }}
              settings={{ label: strings.dock.settings, ...HIDDEN }}
            />
          </div>
          <div className={body}>
            <div className={cols}>
              <div className={col}>
                <ModelsSheet
                  values={values}
                  onChange={(patch) => {
                    setValues((v) => ({ ...v, ...patch }));
                  }}
                />
              </div>
            </div>
          </div>
        </section>
        {/* After the sheet, outside its bevel clip: the point sits across the top hairline. */}
        <div className={grab}>
          <GrabPoint
            label={open ? strings.dock.grab.close : strings.dock.grab.open}
            expanded={open}
            controls={SHEET_ID}
            onToggle={() => {
              setSheet(!open);
            }}
          />
        </div>
      </div>
    </div>
  );
};
