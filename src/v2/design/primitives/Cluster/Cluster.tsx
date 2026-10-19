import type { JSX, ReactNode } from "react";

import type { Space } from "../../tokens/tokens";
import styles from "./Cluster.module.css";

/** R7: variant keys and values, typed from the space scale (R6). */
export const variants = {
  gap: ["0", "1", "2", "3", "4", "5", "6", "7", "8"] as const satisfies readonly Space[],
  align: ["start", "center", "baseline", "end"] as const,
  justify: ["start", "between", "end"] as const,
};

export type ClusterProps = {
  children?: ReactNode;
  gap?: (typeof variants.gap)[number];
  align?: (typeof variants.align)[number];
  justify?: (typeof variants.justify)[number];
};

/** Horizontal, wrapping row. Gap from the --s-* scale; no outer margin (R6). */
export const Cluster = ({
  children,
  gap = "2",
  align = "center",
  justify = "start",
}: ClusterProps): JSX.Element => {
  const root = styles["root"] ?? "cluster-root";
  return (
    <div className={root} data-gap={gap} data-align={align} data-justify={justify}>
      {children}
    </div>
  );
};
