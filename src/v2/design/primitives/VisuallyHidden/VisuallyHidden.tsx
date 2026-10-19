import type { JSX, ReactNode } from "react";

/** The global utility in design/base/base.css; the one sr-only definition (B2). */
const SR_ONLY = "sr-only";

export type VisuallyHiddenProps = {
  children?: ReactNode;
  id?: string | undefined;
  /** Element to render; h1 for the per-story page heading, h2 for a pane's hidden title. */
  as?: "span" | "h1" | "h2";
};

/** Text for assistive tech only: fully clipped, never painted. Never put emoji in here (B2). */
export const VisuallyHidden = ({ children, id, as = "span" }: VisuallyHiddenProps): JSX.Element =>
  as === "h1" ? (
    <h1 className={SR_ONLY} id={id}>
      {children}
    </h1>
  ) : as === "h2" ? (
    <h2 className={SR_ONLY} id={id}>
      {children}
    </h2>
  ) : (
    <span className={SR_ONLY} id={id}>
      {children}
    </span>
  );
