import type { JSX } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Dock, type DockTab } from "../../design/primitives/Dock";
import { spokenLabel } from "../../design/primitives/LabelGlyphs";
import { VisuallyHidden } from "../../design/primitives/VisuallyHidden";
import { FanDiamond, GrabPoint } from "../../design/primitives/GrabPoint";
import { Tile, TileHalo } from "../../design/primitives/Tile";
import { useWorld } from "../engine/useWorld";
import { createHistory } from "../models/history";
import { ModelsSheet, stepOf } from "../models/ModelsSheet";
import { loadValues, loadView, pageStore, saveValues, saveView } from "../models/store";
import type { ModelsValues } from "../models/values";
import { colourOf, strings } from "../strings";
import { outOfRange } from "../world/bands";
import { endSpread } from "../world/spread";
import { endYear } from "../world/geometry";
import { WorldLayer } from "../world/WorldLayer";
import styles from "./AppShell.module.css";
import { toggleStop } from "./drag";
import { PaneScroll } from "./PaneScroll";
import { dockLayout, paneOf, returnFocus, undoKeyOf, type Pane } from "./panes";
import { Bevel } from "./Bevel";
import { attachPressFlash } from "./press";
import { useSheet } from "./useSheetDrag";
import { DOCK_COLUMNS, SIDE_PANEL, useMedia } from "./useMedia";

/** R7: variant keys and values. */
export const variants = {
  sheet: ["closed", "half", "full"] as const,
  dragging: ["true", "false"] as const,
  column: ["open", "closed"] as const,
  undo: ["hidden"] as const,
};

const SHEET_ID = "models-sheet";
const TABS: DockTab[] = [
  { id: "models", label: strings.dock.models, shown: true, controls: SHEET_ID },
  { id: "plans", label: strings.dock.plans, shown: false },
  { id: "stats", label: strings.dock.stats, shown: false },
];
const HIDDEN = { shown: false } as const;
/** U1: the session's Undo history over the committed settings (a field-by-field equality). */
const sameValues = (a: ModelsValues, b: ModelsValues): boolean => stepOf(a, b) === null;
const undoOps = createHistory(sameValues);
const grabButtonOf = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[aria-controls="${SHEET_ID}"]:not([role="tab"])`);
/** U1 Focus: the restored field's own focus stop; a listbox's is its selected option. */
const fieldOf = (focus: string): HTMLElement | null => {
  const at = document.querySelector<HTMLElement>(focus);
  if (at?.getAttribute("role") !== "listbox") return at;
  return at.querySelector<HTMLElement>('[aria-selected="true"]') ?? at;
};

/**
 * Slice 1 shell (V32-BUILD §1a, §1c–§1e): header, headline, the world layer, and the Models
 * sheet: a bottom sheet (half / open) on phones and desktops, a right panel (rail / open) in
 * phone landscape. Only MODELS is shown in the dock; every other slot keeps its box, hidden.
 */
export const AppShell = (): JSX.Element => {
  const [now] = useState(() => Date.now());
  // §1V: the settings come back after a reload (the one store, models/store.ts).
  // U1: the settings and their Undo history move together (session only; never saved).
  const [session, setSession] = useState(() => ({
    values: loadValues(pageStore()),
    history: undoOps.empty,
  }));
  const { values } = session;
  const latest = useRef(session);
  latest.current = session;
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
  const undoTile = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const railProbe = useRef<HTMLSpanElement>(null);
  const refs = useMemo(
    () => ({ root: rootRef, sheet, area, cap: capProbe, rail: railProbe, header: headerRef }),
    [],
  );
  // §1L.5: closed / half / full, dragged, tapped or keyed; every change is announced.
  const { stop, go, tap, key, dragging, below, dyn, full } = useSheet(refs, side);
  const open = stop !== "closed";
  // U1 Hidden: below the half stop (closed, the closed landscape panel, or a drag whose live size
  // has crossed under half; it changes only on the crossing). The history and the keys keep working.
  const low = dragging ? below : !open;
  const shown = session.history.past.length > 0 && !low;
  const tileHad = useRef(false);
  // U1 Focus: the Tile leaving with the sheet hands focus to the grab point first.
  useLayoutEffect(() => {
    if (!low || !tileHad.current) return;
    const at = document.activeElement;
    if (at === undoTile.current || at === document.body) grabButtonOf()?.focus();
  }, [low]);
  const moved = useRef(false);
  const [said, setSaid] = useState("");
  // U1 Accessibility (r48, call4 m1): the live region is cleared, then set on the next frame, so a
  // repeated identical message is announced again (screen readers skip a same-text update).
  const sayFrame = useRef(0);
  const say = (text: string): void => {
    cancelAnimationFrame(sayFrame.current);
    setSaid("");
    sayFrame.current = requestAnimationFrame(() => {
      setSaid(text);
    });
  };
  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    setSaid(strings.dock.sheet[stop]);
  }, [stop]);
  // U1: a release, Enter or blur commits one step; a live drag or held key only previews.
  const change = (patch: Partial<ModelsValues>, live = false): void => {
    setSession((s) => {
      const next = { ...s.values, ...patch };
      const same = sameValues(next, s.values);
      const h = live
        ? same
          ? s.history
          : undoOps.preview(s.history, s.values)
        : undoOps.commit(s.history, s.values, next);
      return same && h === s.history ? s : { values: same ? s.values : next, history: h };
    });
  };
  // Undo / redo one step: the live region names it and the restored field tweens to it. Focus
  // stays where it is (V32-BUILD:860 (6)).
  const [restored, setRestored] = useState<{ focus: string; turn: number }>();
  // U1 Focus: where focus was when a step started, and whether it was on the Tile as it empties.
  const refocus = useRef<{ from: Element | null; emptied: boolean } | null>(null);
  const move = (way: "undo" | "redo"): boolean => {
    const s = latest.current;
    const r = undoOps[way](s.history, s.values);
    const step = stepOf(s.values, r.value);
    if (r.history === s.history || step === null) return false;
    const from = document.activeElement;
    refocus.current = {
      from,
      emptied: from !== null && from === undoTile.current && r.history.past.length === 0,
    };
    setSession({ values: r.value, history: r.history });
    setRestored((was) => ({ focus: step.focus, turn: (was?.turn ?? 0) + 1 }));
    const value = spokenLabel(step.value);
    say(
      way === "undo"
        ? strings.undo.undone(step.field, value, /Mac|iP(hone|ad|od)/.test(navigator.platform))
        : strings.undo.back(step.field, value),
    );
    return true;
  };
  // U1 Focus: never dropped to the page. A step that removes the focused control (F-A c), or
  // empties history under the focused Tile, moves focus to the restored field.
  useLayoutEffect(() => {
    const plan = refocus.current;
    refocus.current = null;
    if (plan === null || restored === undefined) return;
    const lost = plan.from !== null && plan.from !== document.body && !plan.from.isConnected;
    if (!plan.emptied && !lost) return;
    (
      fieldOf(restored.focus) ?? returnFocus(document.getElementById("tab-models"), grabButtonOf())
    )?.focus();
  }, [restored]);
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
      if (event.type === "focusin") tileHad.current = target === undoTile.current;
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

  // U1: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z (not in a text field), from anywhere on the page.
  const moveRef = useRef(move);
  moveRef.current = move;
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      const way = event.defaultPrevented ? null : undoKeyOf(event, target);
      if (way !== null && moveRef.current(way)) event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
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
        returnFocus(document.getElementById("tab-models"), grabButtonOf())?.focus();
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
  const undoCls = styles["undo"] ?? "shell-undo";
  const undoState: (typeof variants.undo)[number] | undefined = shown ? undefined : "hidden";
  const newest = session.history.past.at(-1);
  const undoStep = newest === undefined ? null : stepOf(values, newest);
  const undoName =
    undoStep === null
      ? strings.undo.label
      : strings.undo.name(undoStep.field, spokenLabel(undoStep.value));

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
      {/* T2 soft: the undo Tile's --shadow-tile-soft filters (one per theme), once. */}
      <TileHalo />
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
            colour={colourOf(view.colour)}
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
        {/* Outside the sheet's bevel clip, across its top hairline (z above it). Form 9d: before the
            sheet in the DOM, so Close is the phone sheet's first Tab stop and Tab moves down. */}
        <div className={grab} data-grab="logo">
          <GrabPoint
            label={open ? strings.dock.grab.close : strings.dock.grab.open}
            expanded={open}
            controls={SHEET_ID}
            onToggle={tap}
            onKey={key}
          />
        </div>
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
              <PaneScroll id="models" cover={undoTile} covered={shown}>
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
                  onChange={change}
                  restored={restored}
                />
              </PaneScroll>
              <div className={reserved} data-pane="plans" aria-hidden="true" />
              <div className={reserved} data-pane="stats" aria-hidden="true" />
            </div>
            {/* U1: the one undo Tile, page-level over the sheet's foot and outside every scroller
                (after the panes, so the Tab order is unchanged); inert while hidden. */}
            <div className={undoCls} data-undo={undoState} inert={!shown}>
              <Tile
                ref={undoTile}
                variant="soft"
                glyph="undo"
                label={strings.undo.label}
                aria-label={undoName}
                onClick={() => {
                  move("undo");
                }}
              />
            </div>
          </div>
        </section>
        <p role="status">
          <VisuallyHidden>{said}</VisuallyHidden>
        </p>
      </div>
    </div>
  );
};
