import type { JSX, ReactNode } from "react";

import type { Space } from "../../tokens/tokens";
import styles from "./Stack.module.css";

/** R7: variant keys and values, typed from the space scale (R6). */
export const variants = {
  gap: ["0", "1", "2", "3", "4", "5", "6", "7", "8"] as const satisfies readonly Space[],
  pad: ["true", "false"] as const,
};

export type StackProps = {
  children?: ReactNode;
  gap?: (typeof variants.gap)[number];
  pad?: boolean;
};

/** Vertical stack. Gap from the --s-* scale through data-gap; no outer margin (R6). */
export const Stack = ({ children, gap = "3", pad = false }: StackProps): JSX.Element => {
  const root = styles["root"] ?? "stack-root";
  return (
    <div className={root} data-gap={gap} data-pad={pad ? "true" : "false"}>
      {children}
    </div>
  );
};
