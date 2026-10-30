import type { ReactElement, ReactNode } from "react";
import { useLayoutEffect } from "react";

import { Tile } from "./Tile";
import styles from "./Tile.stories.module.css";

/** Plain CSF 3. T2: soft only (loud is queued); hover is shot by the visual matrix with :hover. */
export default { title: "Primitives/Tile" };

const noop = (): void => undefined;

const ROWS = [
  "Starting price 64,000",
  "Growth model Power law",
  "Sample count 1,000",
  "Plans 3 of 3",
  "Volatility 80%",
];

/** On --surface with text rows behind, as in the sheet, so the feather is judged where it lives. */
const Frame = ({ children }: { children: ReactNode }): ReactElement => {
  const frame = styles["frame"] ?? "tile-story-frame";
  const rows = styles["rows"] ?? "tile-story-rows";
  return (
    <div className={frame}>
      <div className={rows} aria-hidden="true">
        {ROWS.map((row) => (
          <p key={row}>{row}</p>
        ))}
      </div>
      {children}
    </div>
  );
};

export const Default = (): ReactElement => (
  <Frame>
    <Tile label="Undo" onClick={noop} />
  </Frame>
);
export const Soft = (): ReactElement => (
  <Frame>
    <Tile variant="soft" label="Undo" onClick={noop} />
  </Frame>
);
export const WithGlyph = (): ReactElement => (
  <Frame>
    <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />
  </Frame>
);
/** The visual matrix focuses it with the keyboard before the screenshot. */
export const Focus = (): ReactElement => (
  <Frame>
    <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />
  </Frame>
);
export const Disabled = (): ReactElement => (
  <Frame>
    <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} disabled />
  </Frame>
);
export const LongText = (): ReactElement => (
  <Frame>
    <Tile variant="soft" glyph="undo" label="Restore the original settings" onClick={noop} />
  </Frame>
);
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Frame>
      <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />
    </Frame>
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
  return (
    <Frame>
      <Tile variant="soft" glyph="undo" label="Undo" onClick={noop} />
    </Frame>
  );
};
