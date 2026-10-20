import type { JSX } from "react";

import styles from "./SectionLabel.module.css";

/** R7: variant keys and values. */
export const variants = {
  level: ["section", "group"] as const,
  side: ["start", "end"] as const,
};

export type SectionLabelProps = {
  text: string;
  /** "section": pane titles; "group": a label over a group of controls (shorter hairlines). */
  level?: (typeof variants.level)[number];
  /** Heading level for sections; groups render a span (name a role="group" via its id). */
  as?: "h2" | "h3" | "span";
  id?: string | undefined;
};

/**
 * The Certificate label (STYLE v38): a section is centred caps in --accent between two fine
 * hairlines that taper away from the text (--section-rule-len); a group (§1M) is left-aligned
 * small caps with one --group-rule-len hairline after it. Text is used exactly as given.
 */
export const SectionLabel = ({
  text,
  level = "section",
  as = level === "section" ? "h2" : "span",
  id,
}: SectionLabelProps): JSX.Element => {
  const root = styles["root"] ?? "section-label-root";
  const rule = styles["rule"] ?? "section-label-rule";
  const label = styles["text"] ?? "section-label-text";
  const Tag = as;
  return (
    <div className={root} data-level={level}>
      {level === "section" ? <span className={rule} data-side="start" aria-hidden="true" /> : null}
      <Tag className={label} id={id}>
        {text}
      </Tag>
      <span className={rule} data-side="end" aria-hidden="true" />
    </div>
  );
};
