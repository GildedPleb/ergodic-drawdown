import type { ReactElement } from "react";
import { useLayoutEffect } from "react";

import { Tile } from "./Tile";

/** Plain CSF 3. T2: soft only (loud is queued); hover is shot by the visual matrix with :hover. */
export default { title: "Primitives/Tile" };

const noop = (): void => undefined;

export const Default = (): ReactElement => <Tile label="Undo" onClick={noop} />;
export const Soft = (): ReactElement => <Tile variant="soft" label="Undo" onClick={noop} />;
export const WithGlyph = (): ReactElement => (
  <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />
);
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => (
  <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />
);
export const Disabled = (): ReactElement => (
  <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} disabled />
);
export const LongText = (): ReactElement => (
  <Tile variant="soft" glyph="undo" label="Restore the original settings" onClick={noop} />
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />
  </div>
);
/** 200% OS text: a 32px root, restored when the story unmounts. */
export const LargeText200 = (): ReactElement => {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const was = html.style.fontSize;
    html.style.fontSize = "32px";
    return () => {
      html.style.fontSize = was;
    };
  }, []);
  return <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />;
};
