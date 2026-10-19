import type { JSX, ReactNode } from "react";

import styles from "./Stack.module.css";

export type StackProps = {
  children?: ReactNode;
  gap?: "0" | "1" | "2" | "3" | "4" | "5" | "6";
  pad?: boolean;
};

/** Vertical stack. Gap via token; no outer margin. */
export const Stack = ({ children, gap = "3", pad = false }: StackProps): JSX.Element => {
  const root = styles["root"] ?? "stack-root";
  const style = { ["--stack-gap" as string]: `var(--space-${gap})` };
  return (
    <div className={root} data-pad={pad ? "true" : "false"} style={style}>
      {children}
    </div>
  );
};
