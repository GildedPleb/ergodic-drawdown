import type { ReactElement } from "react";

import { UndoChip } from "./UndoChip";

/** Plain CSF 3. */
export default { title: "Primitives/UndoChip" };

const noop = (): void => undefined;
const name = (field: string, value: string): string => `Undo ${field}, back to ${value}`;
const chip = (field: string, value: string): ReactElement => (
  <UndoChip step={{ field, value }} label="Undo" name={name} onUndo={noop} />
);

export const Default = (): ReactElement => chip("Years", "30");
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => chip("Years", "30");
/** In a narrow slot the field name truncates with an ellipsis; the value never does. */
export const LongText = (): ReactElement => chip("Statistical Sample Count (1-10k)", "1,000");
export const EmojiLabel = (): ReactElement => chip("Walk Strategy", "🟢🟢🟢🔴");
export const Linen = (): ReactElement => (
  <div data-theme="linen">{chip("Clamp maximum price", "on")}</div>
);
