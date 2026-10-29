/**
 * v2 Models pane schema. G12 (test/v2/g12-models.test.ts) checks the pane it drives against
 * main's model code via test/v2/main-models.golden.json.
 */
import { buildOldUiModelsSnapshot, type ModelsPaneSnapshot } from "./from-old-ui";

export type { ModelsPaneSnapshot };

/** Canonical v2 Models pane option set + defaults. */
export const modelsPaneSchema: ModelsPaneSnapshot = buildOldUiModelsSnapshot();
