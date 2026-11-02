import type { ReactElement, ReactNode } from "react";
import { useLayoutEffect } from "react";

import { Tile, variants } from "./Tile";
import styles from "./Tile.stories.module.css";

/** Plain CSF 3 (V32:916). Hover is shot by the visual matrix with :hover, not by a story. */
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

type Look = { label?: string; disabled?: boolean };

/** One framed Tile per variant, soft first, for the stories that show both. */
const Both = ({ label = "Undo", disabled = false }: Look): ReactElement => (
  <>
    {variants.variant.map((variant) => (
      <Frame key={variant}>
        <Tile variant={variant} glyph="undo" label={label} onClick={noop} disabled={disabled} />
      </Frame>
    ))}
  </>
);

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
export const Loud = (): ReactElement => (
  <Frame>
    <Tile variant="loud" label="Undo" onClick={noop} />
  </Frame>
);
export const WithGlyph = (): ReactElement => <Both />;
/** The visual matrix focuses each with the keyboard before the screenshot. */
export const Focus = (): ReactElement => <Both />;
export const Disabled = (): ReactElement => <Both disabled />;
export const LongText = (): ReactElement => <Both label="Restore the original settings" />;
export const Linen = (): ReactElement => (
  <div data-theme="linen">
    <Both />
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
  return <Both />;
};
