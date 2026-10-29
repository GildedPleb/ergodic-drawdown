import { expect, test } from "bun:test";

import { variants as shell } from "../../src/v2/app/shell/AppShell";
import { variants as pane } from "../../src/v2/app/shell/PaneScroll";
import { variants as amount } from "../../src/v2/design/primitives/Amount/Amount";
import { variants as assetRow } from "../../src/v2/design/primitives/AssetRow/AssetRow";
import { variants as dock } from "../../src/v2/design/primitives/Dock/Dock";
import { variants as select } from "../../src/v2/design/primitives/Select/Select";
import { variants as slider } from "../../src/v2/design/primitives/Slider/Slider";
import { variants as mark } from "../../src/v2/design/primitives/CheckMark/CheckMark";
import { variants as cluster } from "../../src/v2/design/primitives/Cluster/Cluster";
import { variants as grid } from "../../src/v2/design/primitives/Grid/Grid";
import { variants as ledger } from "../../src/v2/design/primitives/LedgerRow/LedgerRow";
import { variants as glyphs } from "../../src/v2/design/primitives/LabelGlyphs/LabelGlyphs";
import { variants as numberField } from "../../src/v2/design/primitives/NumberField/NumberField";
import { variants as stack } from "../../src/v2/design/primitives/Stack/Stack";
import { variants as tick } from "../../src/v2/design/primitives/TickToggle/TickToggle";
import { space } from "../../src/v2/design/tokens/tokens";

test("R6: Stack, Cluster and Grid gap props cover exactly the --s-* scale", () => {
  for (const v of [stack, cluster, grid]) expect([...v.gap]).toEqual([...space]);
});

test("R7: exported variants are the data-* values the components render", () => {
  expect([...tick.disabled, ...tick.size]).toEqual(["true", "pair"]);
  expect(Object.keys(tick)).toEqual(["disabled", "size"]);
  expect([...mark.state, ...mark.size, ...mark.disabled]).toEqual(["on", "large", "true"]);
  expect([...ledger.kind]).toEqual(["pair"]);
  expect([...amount.unit]).toEqual(["btc", "usd"]);
  expect([...glyphs.tone]).toEqual(["up", "down"]);
  expect([...grid.columns]).toEqual(["1", "2", "3", "4"]);
  expect([...cluster.align, ...cluster.justify].length).toBe(7);
  expect([...numberField.invalid]).toEqual(["true"]);
  expect([...numberField.disabled]).toEqual(["true", "false"]);
  // §1MP: SectionLabel has one look (no levels); AssetRow is open or not (C1a: OFF has no look of
  // its own on the name; aria-pressed carries it).
  expect([...assetRow.state]).toEqual(["open"]);
  expect(Object.keys(assetRow)).toEqual(["state"]);
  expect([...pane.top, ...pane.more, ...pane.scrolling]).toEqual(["true", "true", "true"]);
  expect([...dock.orientation, ...dock.shown, ...dock.selected]).toEqual([
    "row",
    "rail",
    "columns",
    "false",
    "true",
  ]);
  expect([...shell.sheet, ...shell.dragging, ...shell.column]).toEqual([
    "closed",
    "half",
    "full",
    "true",
    "false",
    "open",
    "closed",
  ]);
  expect([...slider.disabled]).toEqual(["true"]);
  expect([...select.cols, ...select.state]).toEqual(["2", "pick"]);
});
