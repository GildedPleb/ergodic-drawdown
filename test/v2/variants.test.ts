import { expect, test } from "bun:test";

import { variants as amount } from "../../src/v2/design/primitives/Amount/Amount";
import { variants as cluster } from "../../src/v2/design/primitives/Cluster/Cluster";
import { variants as grid } from "../../src/v2/design/primitives/Grid/Grid";
import { variants as glyphs } from "../../src/v2/design/primitives/LabelGlyphs/LabelGlyphs";
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
});
