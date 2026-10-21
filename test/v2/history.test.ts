/** V32-BUILD §2A: the historic price toggle (flag wiring, the dataset, the zoom frame). */
import { file } from "bun";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import marketData from "../../src/data/datasets/bitcoin_weekly_prices_transformed_2.json";
import { engineConfig } from "../../src/v2/app/engine/config";
import { ModelsSheet } from "../../src/v2/app/models/ModelsSheet";
import { defaultModelsValues } from "../../src/v2/app/models/values";
import { strings } from "../../src/v2/app/strings";
import { priceBands } from "../../src/v2/app/world/bands";
import { fittedDomain, frameView, targetDomain } from "../../src/v2/app/world/draw";
import { fitDomain } from "../../src/v2/app/world/geometry";
import {
  HISTORIC_LABEL,
  historyOf,
  historyRange,
  unionRange,
} from "../../src/v2/app/world/history";
import { framedView, isZoomed, panBy, zoomAt } from "../../src/v2/app/world/zoom";

/** The engine's dataset label for a fixture band (no min/max given: the edge is p1–p99). */
const bandLabel = (q: string): string =>
  q === "Median" ? "Median Bitcoin Price" : `${q} Percentile Bitcoin Price`;
const WEEK = 7 * 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 20).getTime();
const inputs = { currentBlock: 1, currentPrice: 2, halvings: {}, interim: [], now: NOW };

test("2A: the tick drives render.showHistoric; off by default; nothing else in the config moves", () => {
  const off = engineConfig(defaultModelsValues(), inputs);
  const on = engineConfig(defaultModelsValues(), inputs, true);
  expect(off?.render.showHistoric).toBe(false);
  expect(on?.render.showHistoric).toBe(true);
  expect(on === null || off === null ? null : { ...on, render: off.render }).toEqual(off);
});

const sheetHtml = (historic?: boolean): string =>
  renderToStaticMarkup(
    createElement(ModelsSheet, {
      values: defaultModelsValues(),
      onChange: () => undefined,
      initialOpen: ["bitcoin"],
      ...(historic === undefined ? {} : { historic }),
    }),
  );

test('2A / §1MP 8: the tick row heads Bitcoin\'s "On the chart", labelled, off unless told', () => {
  const off = sheetHtml();
  const at = off.indexOf(strings.models.showHistoric);
  expect(strings.models.showHistoric).toBe("Show historic price");
  expect(at > 0).toBe(true);
  expect(at > off.indexOf(">On the chart<")).toBe(true);
  expect(at < off.indexOf('id="row-colour"')).toBe(true);
  expect(off.slice(off.lastIndexOf("<button", at), at).includes('aria-checked="false"')).toBe(true);
  // r2 (Form): just the tick and the label, no ON/OFF word.
  const row = off.slice(off.lastIndexOf("<button", at), off.indexOf("</button>", at));
  expect(row.includes(">OFF<") || row.includes(">ON<")).toBe(false);
  const on = sheetHtml(true);
  const atOn = on.indexOf(strings.models.showHistoric);
  expect(on.slice(on.lastIndexOf("<button", atOn), atOn).includes('aria-checked="true"')).toBe(
    true,
  );
});

test("2A: HISTORIC_LABEL is main's own label for both historic datasets (G12, read from source)", async () => {
  const baked = await file(`${import.meta.dir}/../../src/data/datasets/historic.tsx`).text();
  const interim = await file(`${import.meta.dir}/../../src/contexts/computed/interim.ts`).text();
  expect(baked.includes(`label: \`${HISTORIC_LABEL}\``)).toBe(true);
  expect(interim.includes(`label: \`${HISTORIC_LABEL}\``)).toBe(true);
});

test("2A: history reads both labelled sets, drops bad and future points, sorts, dedupes", () => {
  const h = historyOf(
    [
      {
        label: HISTORIC_LABEL,
        data: [
          { x: NOW - 2 * WEEK, y: 10 },
          { x: NOW - 4 * WEEK, y: 5 },
        ],
      },
      { label: "Median Bitcoin Price", data: [{ x: NOW - 9 * WEEK, y: 1 }] },
      {
        label: HISTORIC_LABEL,
        data: [
          { x: NOW - 2 * WEEK, y: 11 },
          { x: NOW, y: 12 },
          { x: NOW + WEEK, y: 99 },
          { x: NOW - 3 * WEEK, y: Number.NaN },
          { x: NOW - 3 * WEEK, y: 0 },
        ],
      },
    ],
    NOW,
  );
  expect(h === null ? null : { t: [...h.t], y: [...h.y], past: h.past }).toEqual({
    t: [-4, -2, 0],
    y: [5, 11, 12],
    past: 4,
  });
  expect(historyOf([{ label: HISTORIC_LABEL, data: [] }], NOW)).toBe(null);
  expect(historyOf(undefined, NOW)).toBe(null);
});

test("2A: the real dataset starts at its first print (17 July 2010, $0.06262), never earlier", () => {
  const h = historyOf([{ label: HISTORIC_LABEL, data: marketData }], NOW);
  const first = marketData[0];
  expect(first).toEqual({ x: Date.UTC(2010, 6, 17), y: 0.06262 });
  expect(h?.y[0]).toBe(0.06262);
  expect(Math.abs((h?.past ?? 0) - (NOW - Date.UTC(2010, 6, 17)) / WEEK) < 1e-6).toBe(true);
  expect(h?.t.length).toBe(marketData.length);
});

test("2A zoom bound: on, the full frame runs from the first print to the run's end; off, Today to end", () => {
  expect(frameView(undefined, 1040, 0)).toEqual({ from: 0, to: 1040 });
  expect(frameView(undefined, 1040, 848)).toEqual({ from: -848, to: 1040 });
  // A window never leaves the frame: pans stop hard at the first print and at the end.
  expect(frameView({ from: -2000, to: -1900 }, 1040, 848)).toEqual({ from: -848, to: -748 });
  expect(frameView({ from: 2000, to: 2100 }, 1040, 848)).toEqual({ from: 940, to: 1040 });
  expect(frameView({ from: -2000, to: -1900 }, 1040, 0)).toEqual({ from: 0, to: 100 });
  // WorldLayer's frame positions: 0 is the first print, past is today.
  const last = 1040 + 848;
  expect(framedView(null, last, 848)).toEqual({
    framed: { from: 0, to: last },
    view: { from: -848, to: 1040 },
  });
  const panned = panBy(zoomAt({ from: 0, to: last }, 0.1, 0, last), -1e6, last);
  expect(framedView(panned, last, 848).view.from).toBe(-848);
  expect(isZoomed({ from: 0, to: last }, last)).toBe(false);
});

const bands = priceBands(
  (
    [
      ["1st", 0.5],
      ["5th", 0.6],
      ["25th", 0.8],
      ["Median", 1],
      ["75th", 1.25],
      ["95th", 1.6],
      ["99th", 2],
    ] as const
  ).map(([name, k]) => ({
    label: bandLabel(name),
    data: Array.from({ length: 101 }, (_, i) => ({ x: NOW + i * WEEK, y: 1e5 * k * 1.01 ** i })),
  })),
);

test("2A: the Y axis covers the historic prints in the frame, and in a zoomed window only its own", () => {
  if (bands === null) throw new Error("bands");
  const h = historyOf(
    [
      {
        label: HISTORIC_LABEL,
        data: [
          { x: NOW - 50 * WEEK, y: 0.1 },
          { x: NOW - 10 * WEEK, y: 1000 },
          { x: NOW, y: 5e4 },
        ],
      },
    ],
    NOW,
  );
  expect(fittedDomain(bands).lo > 1e4).toBe(true);
  expect(fittedDomain(bands, h).lo < 0.1).toBe(true);
  // A window from 20 weeks back sees the $1,000 and $50k prints and the bands, not the $0.10.
  const win = targetDomain(bands, h, { from: -20, to: 10 }, true);
  const range = unionRange({ low: 5e4, high: 1e5 * 2 * 1.01 ** 10 }, historyRange(h, -20, 10));
  expect(range).toEqual({ low: 1000, high: 1e5 * 2 * 1.01 ** 10 });
  expect(win).toEqual(fitDomain(1000, 1e5 * 2 * 1.01 ** 10));
  // Unzoomed, the whole frame's fit.
  expect(targetDomain(bands, h, { from: -50, to: 100 }, false)).toEqual(fittedDomain(bands, h));
  expect(historyRange(null, -1, 1)).toBe(null);
  expect(unionRange(null, null)).toBe(null);
});
