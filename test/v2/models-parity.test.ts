import { file } from "bun";
import { expect, test } from "bun:test";

import { buildOldUiModelsSnapshot, modelsPaneSchema } from "../../src/v2/app/models";

const snapshotPath = `${import.meta.dir}/old-ui-models.snapshot.json`;

test("G12: v2 modelsPaneSchema deep-equals committed old-UI snapshot", async () => {
  const committed = JSON.parse(await file(snapshotPath).text()) as unknown;
  expect(modelsPaneSchema).toEqual(committed);
});

test("G12: regenerating the snapshot matches the committed file (not stale)", async () => {
  const committed = JSON.parse(await file(snapshotPath).text()) as unknown;
  expect(buildOldUiModelsSnapshot()).toEqual(committed);
});

test("G12: 7 models, Power Law Regression Median first and default", () => {
  expect(modelsPaneSchema.modelOrder.length).toBe(7);
  expect(modelsPaneSchema.modelOrder[0]).toBe("Power Law Regression Median");
  expect(modelsPaneSchema.defaultModel).toBe("Power Law Regression Median");
});

test("G12: 9 walks, Bubble default, Vote Count and emoji walk last", () => {
  expect(modelsPaneSchema.walks.length).toBe(9);
  expect(modelsPaneSchema.defaultWalk).toBe("Bubble");
  expect(modelsPaneSchema.walks[0]).toBe("Bubble");
  expect(modelsPaneSchema.walks[7]).toBe("Vote Count");
  expect(modelsPaneSchema.walks[8]).toBe("🟢🟢🟢🔴");
});
