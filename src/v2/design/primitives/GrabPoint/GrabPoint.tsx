import type { JSX, KeyboardEvent } from "react";

import { FanDiamond } from "./FanDiamond";
import styles from "./GrabPoint.module.css";

export type GrabPointProps = {
  /** Accessible name, e.g. "Open the Models sheet". */
  label: string;
  expanded: boolean;
  controls?: string | undefined;
  onToggle?: () => void;
};

const blockRepeat = (event: KeyboardEvent<HTMLButtonElement>): void => {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
};

/**
 * The sheet's grab point (V32-BUILD §1a): the 26px fan-diamond centred across the bevel hairline.
 * It doesn't move or scale; the button around it is a 44px hit target.
 */
export const GrabPoint = ({ label, expanded, controls, onToggle }: GrabPointProps): JSX.Element => {
  const root = styles["root"] ?? "grab-root";
  const mark = styles["mark"] ?? "grab-mark";
  return (
    <button
      type="button"
      className={root}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      onKeyDown={blockRepeat}
      onClick={onToggle}
    >
      <span className={mark}>
        <FanDiamond />
      </span>
    </button>
  );
};
