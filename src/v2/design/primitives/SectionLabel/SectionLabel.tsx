import type { JSX } from "react";

import styles from "./SectionLabel.module.css";

export type SectionLabelProps = {
  text: string;
  /** Heading level; a span when it only names a role="group" (via its id). */
  as?: "h2" | "h3" | "span";
  id?: string | undefined;
};

/**
 * V32-BUILD §1MP item 3: a section title. Jost 600 caps in --accent on one line, between two
 * equal 2px --accent rules (70%) that taper to a point and fade out at their outer ends. Title
 * and rules span the text column (from --col) and centre in it; the tracking after the last
 * letter is trimmed. Text is used exactly as given. A title too long for the column wraps,
 * centred, rather than scroll the page sideways (G7).
 */
export const SectionLabel = ({ text, as = "h3", id }: SectionLabelProps): JSX.Element => {
  const root = styles["root"] ?? "section-label-root";
  const Tag = as;
  return (
    <Tag className={root} id={id}>
      {text}
    </Tag>
  );
};
