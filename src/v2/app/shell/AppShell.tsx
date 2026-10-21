import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Dock, type DockTab } from "../../design/primitives/Dock";
import { VisuallyHidden } from "../../design/primitives/VisuallyHidden";
import { FanDiamond, GrabPoint } from "../../design/primitives/GrabPoint";
import { useWorld } from "../engine/useWorld";
import { ModelsSheet } from "../models/ModelsSheet";
import { loadValues, loadView, pageStore, saveValues, saveView } from "../models/store";
import type { ModelsValues } from "../models/values";
import { strings } from "../strings";
import { outOfRange } from "../world/bands";
import { endSpread } from "../world/spread";
import { endYear } from "../world/geometry";
import { WorldLayer } from "../world/WorldLayer";
import styles from "./AppShell.module.css";
import { toggleStop } from "./drag";
import { PaneScroll } from "./PaneScroll";
import { dockLayout, paneOf, returnFocus, type Pane } from "./panes";
import { Bevel } from "./Bevel";
import { attachPressFlash } from "./press";
import { useSheet } from "./useSheetDrag";
import { DOCK_COLUMNS, SIDE_PANEL, useMedia } from "./useMedia";

/** R7: variant keys and values. */
export const variants = {
  sheet: ["closed", "half", "full"] as const,
  dragging: ["true", "false"] as const,
  column: ["open", "closed"] as const,
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
  // §1V: the settings come back after a reload (the one store, models/store.ts).
  const [values, setValues] = useState<ModelsValues>(() => loadValues(pageStore()));
  useEffect(() => {
    saveValues(pageStore(), values);
  }, [values]);
  // §1M Bitcoin's square (OFF: the empty frame and its caption, no headline), §2A "Show historic
  // price" (render.showHistoric) and the colour: kept across a reload too (Form §1MP ruling 3).
  const [view, setView] = useState(() => loadView(pageStore()));
  useEffect(() => {
    saveView(pageStore(), view);
  }, [view]);
  const on = view.bitcoin;
  const historic = view.historic;
  // The chart column reflows once, when the panel has finished sliding in (§1e).
  const [column, setColumn] = useState(false);
  const side = useMedia(SIDE_PANEL);
  const wide = useMedia(DOCK_COLUMNS);
  const rootRef = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const capProbe = useRef<HTMLSpanElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const railProbe = useRef<HTMLSpanElement>(null);
  const refs = useMemo(
    () => ({ root: rootRef, sheet, area, cap: capProbe, rail: railProbe, header: headerRef }),
    [],
  );
  // §1L.5: closed / half / full, dragged, tapped or keyed; every change is announced.
  const { stop, go, tap, key, dragging, dyn, full } = useSheet(refs, side);
  const open = stop !== "closed";
  const moved = useRef(false);
  const [said, setSaid] = useState("");
  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    setSaid(strings.dock.sheet[stop]);
  }, [stop]);
  // §1L.2: the pane last clicked, tapped or tabbed into draws its layer and selects its tab.
  const [pane, setPane] = useState<Pane>("models");
  const world = useWorld(values, now, historic);

  const { bands } = world;
  const overflow = bands !== null && outOfRange(bands);
  // Form 2A-r3: the headline claims only what N supports, by the end label's own rule.
  const ends =
    bands === null || overflow ? null : ([endSpread(bands), endYear(now, bands.weeks)] as const);
  const idle = overflow ? strings.headline.outOfRange : strings.headline.pending;
  const sentence = ends === null ? idle : strings.headline.sentence(...ends);
  const spoken = ends === null ? idle : strings.headline.spoken(...ends);

  const setSheet = (next: boolean): void => {
    go(next ? toggleStop("closed", side) : "closed");
    if (!next) setColumn(false);
  };

  useEffect(() => {
    if (!side || !open) return undefined;
    // Opening the panel moves focus into it (§1i); the column reflow waits for the slide.
    sheet.current?.querySelector<HTMLElement>('[role="listitem"] button')?.focus();
    const done = window.setTimeout(() => {
      setColumn(true);
    }, 400);
    return () => {
      window.clearTimeout(done);
    };
  }, [side, open]);

  // Document listeners (G4: no handlers on plain elements in app/).
  useEffect(() => {
    const onEnter = (event: Event): void => {
      const { target } = event;
      if (target instanceof Element) setPane((p) => paneOf(target, p));
    };
    // §1O: a touch press fills the control from the first frame, for 100ms at least.
    const unpress = attachPressFlash(document, () =>
      getComputedStyle(document.documentElement).getPropertyValue("--hover").trim(),
    );
    document.addEventListener("focusin", onEnter);
    document.addEventListener("pointerdown", onEnter);
    return () => {
      document.removeEventListener("focusin", onEnter);
      document.removeEventListener("pointerdown", onEnter);
      unpress();
    };
  }, []);

  // Esc closes the sheet or panel (a row editor stops its own Esc first) and returns focus to
  // the tab (§1i). A document listener: feature code puts no key handlers on plain elements (G4).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setSheet(false);
      // Probe m9: on a phone the closed sheet hides the dock row, so focus goes to the grab
      // button there; measured after the close renders.
      requestAnimationFrame(() => {
        const grabButton = document.querySelector<HTMLElement>(
          `[aria-controls="${SHEET_ID}"]:not([role="tab"])`,
        );
        returnFocus(document.getElementById("tab-models"), grabButton)?.focus();
      });
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
  const bevel = styles["bevel"] ?? "shell-bevel";
  const grab = styles["grab"] ?? "shell-grab";
  const beat = styles["beat"] ?? "shell-beat";
  const beatText = styles["beatText"] ?? "shell-beat-text";
  const slot = styles["slot"] ?? "shell-slot";
  const dockRow = styles["dockRow"] ?? "shell-dock-row";
  const heading = styles["heading"] ?? "shell-heading";
  const body = styles["body"] ?? "shell-body";
  const cols = styles["cols"] ?? "shell-cols";
  const reserved = styles["reserved"] ?? "shell-reserved";
  const edge = styles["edge"] ?? "shell-edge";
  const probe = styles["probe"] ?? "shell-probe";
  const railProbeCls = styles["railProbe"] ?? "shell-rail-probe";

  const sheetState: (typeof variants.sheet)[number] = stop;
  const dragState: (typeof variants.dragging)[number] = dragging ? "true" : "false";
  const px = `${String(dyn)}px`;
  const columnState: (typeof variants.column)[number] = side && column ? "open" : "closed";

  return (
    <div
      ref={rootRef}
      className={root}
      data-sheet={sheetState}
      data-dragging={dragState}
      data-column={columnState}
      data-active-pane={pane}
      style={{ "--dyn-sheet": px, "--dyn-panel": px, "--dyn-full": `${String(full)}px` }}
    >
      <main className={columnCls}>
        <header ref={headerRef} className={header}>
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
          <p className={kicker}>
            {on ? strings.headline.kicker(values.samples, values.model) : ""}
          </p>
          {/* One h1 at every size: the phone title, or the sentence where the headline shows. */}
          <h1 className={heading}>
            <span className={title}>{strings.headline.phoneTitle}</span>
            <span className={dh}>{on ? sentence : ""}</span>
            {on ? null : <VisuallyHidden>{strings.chart.off}</VisuallyHidden>}
          </h1>
        </div>
        <div className={chart} data-layer-pane={pane}>
          <WorldLayer
            bands={on ? bands : null}
            history={on ? world.history : null}
            now={now}
            horizon={world.horizon}
            label={on ? spoken : strings.chart.off}
            live={dragging}
            phase={on ? world.phase : "off"}
            onRetry={world.retry}
            busy={world.busy}
          />
        </div>
      </main>
      <div ref={area} className={dockArea}>
        <span ref={capProbe} className={probe} aria-hidden="true" />
        <span ref={railProbe} className={railProbeCls} aria-hidden="true" />
        {/* Landscape: the panel is grabbed from its bevelled left edge (44px strip). */}
        <span className={edge} data-grab="edge" aria-hidden="true" />
        <section ref={sheet} id={SHEET_ID} className={sheetCls} aria-label={strings.dock.models}>
          <Bevel className={bevel} side={side} />
          <div className={beat} data-grab="strip">
            <p className={beatText}>{on ? sentence : ""}</p>
            <span className={slot} aria-hidden="true" />
          </div>
          <div className={dockRow} data-grab="strip">
            <Dock
              orientation={dockLayout(side, !open && !dragging, wide)}
              label={strings.dock.label}
              tabs={TABS}
              selected={pane}
              expanded={open}
              onTab={() => {
                setSheet(!open);
              }}
              search={{ label: strings.dock.search, ...HIDDEN }}
              settings={{ label: strings.dock.settings, ...HIDDEN }}
            />
          </div>
          <div className={body}>
            {/* §1L.2: three equal columns, Models | Plans | Stats; only Models is built yet,
                the other two keep their geometry, hidden. */}
            <div className={cols}>
              <PaneScroll id="models">
                <ModelsSheet
                  on={on}
                  onOn={(bitcoin) => {
                    setView((v) => ({ ...v, bitcoin }));
                  }}
                  historic={historic}
                  onHistoric={(next) => {
                    setView((v) => ({ ...v, historic: next }));
                  }}
                  colour={view.colour}
                  onColour={(colour) => {
                    setView((v) => ({ ...v, colour }));
                  }}
                  yearsMax={world.yearsMax}
                  values={values}
                  onChange={(patch) => {
                    setValues((v) => ({ ...v, ...patch }));
                  }}
                />
              </PaneScroll>
              <div className={reserved} data-pane="plans" aria-hidden="true" />
              <div className={reserved} data-pane="stats" aria-hidden="true" />
            </div>
          </div>
        </section>
        {/* After the sheet, outside its bevel clip: the point sits across the top hairline. */}
        <div className={grab} data-grab="logo">
          <GrabPoint
            label={open ? strings.dock.grab.close : strings.dock.grab.open}
            expanded={open}
            controls={SHEET_ID}
            onToggle={tap}
            onKey={key}
          />
        </div>
        <p role="status">
          <VisuallyHidden>{said}</VisuallyHidden>
        </p>
      </div>
    </div>
  );
};
