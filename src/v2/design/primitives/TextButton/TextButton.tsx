import type { JSX } from "react";

import styles from "./TextButton.module.css";

export type TextButtonProps = { label: string; onClick: () => void };

/** A quiet text button (§1h "Try again"): no box, underlined accent text, a 44px tap target. */
export const TextButton = ({ label, onClick }: TextButtonProps): JSX.Element => {
  const root = styles["root"] ?? "text-button";
  return (
    <button type="button" className={root} onClick={onClick}>
      {label}
    </button>
  );
};
