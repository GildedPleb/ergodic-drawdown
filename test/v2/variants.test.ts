import { expect, test } from "bun:test";

import { variants as amount } from "../../src/v2/design/primitives/Amount/Amount";
import { variants as cluster } from "../../src/v2/design/primitives/Cluster/Cluster";
import { variants as grid } from "../../src/v2/design/primitives/Grid/Grid";
import { variants as glyphs } from "../../src/v2/design/primitives/LabelGlyphs/LabelGlyphs";
import { variants as numberField } from "../../src/v2/design/primitives/NumberField/NumberField";
import { variants as select } from "../../src/v2/design/primitives/Select/Select";
import { variants as stack } from "../../src/v2/design/primitives/Stack/Stack";
import { variants as tick } from "../../src/v2/design/primitives/TickToggle/TickToggle";
import { space } from "../../src/v2/design/tokens/tokens";

test("R6: Stack, Cluster and Grid gap props cover exactly the --s-* scale", () => {
  for (const v of [stack, cluster, grid]) expect([...v.gap]).toEqual([...space]);
});

test("R7: exported variants are the data-* values the components render", () => {
  expect([...tick.state]).toEqual(["on", "off"]);
  expect([...tick.disabled]).toEqual(["true", "false"]);
  expect([...amount.unit]).toEqual(["btc", "usd"]);
  expect([...glyphs.tone]).toEqual(["up", "down"]);
  expect([...grid.columns]).toEqual(["1", "2", "3", "4"]);
  expect([...cluster.align, ...cluster.justify].length).toBe(7);
  expect([...select.invalid]).toEqual(["true", "false"]);
  expect([...select.disabled]).toEqual(["true", "false"]);
  expect([...select.label]).toEqual(["visible", "hidden"]);
  expect([...numberField.invalid]).toEqual(["true", "false"]);
  expect([...numberField.disabled]).toEqual(["true", "false"]);
});
