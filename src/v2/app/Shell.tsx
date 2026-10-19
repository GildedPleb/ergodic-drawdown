import type { JSX, ReactNode } from "react";

import styles from "./Shell.module.css";

export type ShellProps = {
  children?: ReactNode;
};

/** Phase 0 placeholder shell. Dock/Models come later. */
export const Shell = ({ children }: ShellProps): JSX.Element => {
  const main = styles["main"] ?? "shell-main";
  return <main className={main}>{children}</main>;
};
