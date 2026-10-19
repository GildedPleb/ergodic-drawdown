/**
 * NumberField acceptance (Form B3): a line-for-line port of main's
 * src/components/input/settled-number.ts (createSettledNumber + parseCanonicalInteger) and of
 * main's live-filtered inputs (model variable, +/-), so v2 commits exactly what main commits.
 * The only addition is Postel-liberal text (m7): commas, spaces, NBSP and U+2212 are normalised
 * before main's parse runs. v2 must not import the old UI (import boundary), hence the port.
 */

/** main: parseCanonicalInteger. */
export const parseCanonicalInteger = (text: string): number => {
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || String(parsed) !== text) return Number.NaN;
  return parsed;
};

/** m7: "1,000", "2 000", "2\u00A0000", "\u22120.4" → main's parser input. */
export const normalizeNumberText = (text: string): string =>
  text.replace(/[\s,\u00A0\u202F\u2009]/g, "").replace(/\u2212/g, "-");

export type NumberParse = "float" | "int";

export const parseNumber = (text: string, parse: NumberParse): number => {
  const clean = normalizeNumberText(text);
  return parse === "int" ? parseCanonicalInteger(clean) : Number.parseFloat(clean);
};

/**
 * "settle": main's useSettledNumber (commit accepted keystrokes, keep the draft while editing,
 * settle on blur / Enter: empty → emptyValue or the last value, rejected → the last value).
 * "live": main's controlled inputs that filter every keystroke (`apply` returns the value to
 * commit, or undefined to ignore the keystroke; the field always shows the committed value).
 */
export type NumberRule =
  | { kind: "settle"; accept: (next: number) => boolean; emptyValue?: number | null }
  | { kind: "live"; apply: (next: number) => number | undefined };

export type SettleOptions = {
  rule: NumberRule;
  parse: NumberParse;
  commit: (next: number) => void;
  getValue: () => number;
};

export type SettleController = {
  blur: () => void;
  change: (text: string) => void;
  draft: () => string;
  sync: (next: number) => void;
  /** The draft is non-empty and would not commit (settle only): show the Invalid state. */
  rejected: () => boolean;
  /**
   * Show text without committing (held arrow-key repeats, FL-001): the value commits once, on
   * release, through `change`. A blur before release settles as usual.
   */
  preview: (text: string) => void;
};

/** main renders a NaN state as an empty number field. */
const show = (n: number): string => (Number.isNaN(n) ? "" : String(n));

export const createSettledNumber = (initial: number, options: SettleOptions): SettleController => {
  let draft = show(initial);
  let committed = initial;
  const parse = (text: string): number => parseNumber(text, options.parse);

  // Form N1: the rule is read from `options` at call time, never captured at creation, so a field
  // that stays mounted across a model switch follows the current model's range.
  if (options.rule.kind === "live") {
    const apply = (n: number): number | undefined =>
      options.rule.kind === "live" ? options.rule.apply(n) : n;
    return {
      blur: () => {
        draft = show(committed);
      },
      change: (text) => {
        const next = apply(parse(text));
        if (next !== undefined) {
          committed = next;
          options.commit(next);
        }
        draft = show(committed);
      },
      draft: () => draft,
      sync: (next) => {
        committed = next;
        draft = show(next);
      },
      rejected: () => false,
      preview: (text) => {
        draft = text;
      },
    };
  }

  const accept = (n: number): boolean =>
    options.rule.kind === "settle" ? options.rule.accept(n) : true;
  const emptyValueOf = (): number | null =>
    options.rule.kind === "settle" ? (options.rule.emptyValue ?? null) : null;

  const editing = (): boolean => {
    if (draft === "") return true;
    const parsed = parse(draft);
    return Number.isNaN(parsed) || !accept(parsed);
  };

  const commitIfChanged = (next: number): void => {
    if (next === committed) return;
    committed = next;
    options.commit(next);
  };

  const commitDraft = (): void => {
    if (draft === "") {
      const emptyValue = emptyValueOf();
      if (emptyValue !== null) {
        draft = String(emptyValue);
        commitIfChanged(emptyValue);
        return;
      }
      draft = String(options.getValue());
      return;
    }
    const parsed = parse(draft);
    if (!Number.isNaN(parsed) && accept(parsed)) {
      commitIfChanged(parsed);
      return;
    }
    draft = String(options.getValue());
  };

  return {
    blur: commitDraft,
    change: (text) => {
      draft = text;
      if (text === "") return;
      const parsed = parse(text);
      if (Number.isNaN(parsed) || !accept(parsed)) return;
      commitIfChanged(parsed);
    },
    draft: () => draft,
    sync: (next) => {
      committed = next;
      if (editing()) return;
      const parsed = parse(draft);
      if (parsed === next) return;
      draft = String(next);
    },
    rejected: () => draft !== "" && editing(),
    preview: (text) => {
      draft = text;
    },
  };
};
