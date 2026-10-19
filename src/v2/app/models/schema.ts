/**
 * v2 Models pane schema. Must deep-equal test/v2/old-ui-models.snapshot.json (G12).
 */
import { buildOldUiModelsSnapshot, type ModelsPaneSnapshot } from "./from-old-ui";

export type { ModelsPaneSnapshot };

/** Canonical v2 Models pane option set + defaults. */
export const modelsPaneSchema: ModelsPaneSnapshot = buildOldUiModelsSnapshot();
