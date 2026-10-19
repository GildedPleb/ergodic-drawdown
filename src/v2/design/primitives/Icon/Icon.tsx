import type { JSX } from "react";

import styles from "./Icon.module.css";

type IconName = "check" | "square";

export type IconProps = {
  name: IconName;
  title?: string;
};

const PATHS: Record<IconName, JSX.Element> = {
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  square: <rect x="3" y="3" width="10" height="10" />,
};

/** SVG icon primitive — currentColor, text-sized (1em). Never font glyphs. */
export const Icon = ({ name, title }: IconProps): JSX.Element => {
  const root = styles["root"] ?? "icon-root";
  return (
    <svg
      className={root}
      viewBox="0 0 16 16"
      focusable="false"
      aria-hidden={title === undefined ? true : undefined}
      role={title === undefined ? undefined : "img"}
    >
      {title !== undefined ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
};
