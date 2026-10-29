import type { ReactElement } from "react";

import { UndoChip } from "./UndoChip";

/** Plain CSF 3. */
export default { title: "Primitives/UndoChip" };

const noop = (): void => undefined;
const name = (field: string, value: string): string => `Undo, ${field} back to ${value}`;
const chip = (field: string, value: string): ReactElement => (
  <UndoChip step={{ field, value }} label="Undo" name={name} onUndo={noop} />
);

export const Default = (): ReactElement => chip("Years", "30");
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => chip("Years", "30");
/** :861 (a): in a slot too narrow, whole pieces drop (the field first); no ellipsis. */
export const LongText = (): ReactElement => chip("Statistical Sample Count (1-10k)", "1,000");
export const EmojiLabel = (): ReactElement => chip("How bumpy the ride is", "🟢🟢🟢🔴");
export const Linen = (): ReactElement => (
  <div data-theme="linen">{chip("Clamp Price Max", "on")}</div>
);
