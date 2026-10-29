import type { JSX } from "react";

import styles from "./Icon.module.css";

type IconName = "check" | "square" | "chevron" | "warning" | "search" | "gear";

export type IconProps = {
  name: IconName;
  title?: string;
};

const PATHS: Record<IconName, JSX.Element> = {
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  square: <rect x="3" y="3" width="10" height="10" />,
  chevron: <path d="M4 6.5 8 10.5 12 6.5" />,
  warning: <path d="M8 1.5 15 14H1ZM8 6v4M8 11.75v.5" />,
  search: <path d="M6.75 2.25a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9ZM10 10l4.25 4.25" />,
  gear: (
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5ZM8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4" />
  ),
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
