import type { JSX, ReactNode } from "react";

import type { Space } from "../../tokens/tokens";
import styles from "./Grid.module.css";

/** R7: variant keys and values, typed from the space scale (R6). */
export const variants = {
  gap: ["0", "1", "2", "3", "4", "5", "6", "7", "8"] as const satisfies readonly Space[],
  columns: ["1", "2", "3", "4"] as const,
};

export type GridProps = {
  children?: ReactNode;
  gap?: (typeof variants.gap)[number];
  columns?: (typeof variants.columns)[number];
};

/** Equal-column grid; columns shrink to 0 rather than overflow. Gap from --s-*; no outer margin (R6). */
export const Grid = ({ children, gap = "3", columns = "2" }: GridProps): JSX.Element => {
  const root = styles["root"] ?? "grid-root";
  return (
    <div className={root} data-gap={gap} data-columns={columns}>
      {children}
    </div>
  );
};
