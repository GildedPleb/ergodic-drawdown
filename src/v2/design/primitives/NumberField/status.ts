/**
 * NumberField's message state (V32-BUILD §1g; Form 4d/4e, 2e/2g). Pure, so the rules are testable
 * without a DOM: the component keeps a Status and renders messageOf it.
 */
import type { Bounds, EntryResult, InvalidReason } from "./entry";

/**
 * `reason`: a fraction or stray comma in a count ("whole"), a decimal comma ("dot"), Form 2g;
 * overflow with no bound on that side ("large", 2k); empty where empty isn't allowed ("empty", 2l).
 */
export type Status =
  | { kind: "ok" }
  | { kind: "clamped"; used: number }
  | { kind: "invalid"; reason: InvalidReason | undefined };

/** The status after a commit (Enter, blur, a held key, the wheel); `bound`: a step stopped on one. */
export const statusOf = (result: EntryResult, bound: boolean): Status => {
  if (result.kind === "invalid") return { kind: "invalid", reason: result.reason };
  return result.kind === "clamped" || bound
    ? { kind: "clamped", used: result.value }
    : { kind: "ok" };
};

/**
 * Form 4e / 2i: a short note (a limit note, or an invalid entry's note) stays, blur included,
 * until the field is next edited.
 */
export const afterEdit = (status: Status): Status =>
  status.kind === "ok" ? status : { kind: "ok" };

/**
 * Form 4h / 2i: when `value` arrives, a note stays only if it is this field's own commit
 * (`sent`, the value it last handed to onCommit); any other change (a model switch) clears it,
 * so a note never describes a value that is no longer shown. An invalid entry sends nothing, so
 * an outside change always clears its note.
 */
export const afterValue = (status: Status, value: number, sent: number | null): Status =>
  sent === value ? status : afterEdit(status);

export type Copy = {
  /** Form 4d/4e/4f: "Max is 10,000" / "Min is 1.01", whether from Enter or from blur. */
  limitNote?: ((used: number, bounds: Bounds) => string) | undefined;
  /** Form 2j: the short note for text that isn't a number ("abc", "2x"): "Numbers only". */
  invalidMessage?: ((current: number) => string) | undefined;
  /** Form 2g: "Whole numbers only" and "Use a dot for decimals". */
  wholeMessage?: string | undefined;
  dotMessage?: string | undefined;
  /** Form 2k: overflow in a field with no maximum ("1e309"): "Too large". */
  largeMessage?: string | undefined;
  /** Form 2l: empty where empty isn't allowed: "Enter a number". */
  emptyMessage?: string | undefined;
};

/** The text under the field: the limit note, the 2g/2k/2l note, or the invalid message. */
export const messageOf = (status: Status, value: number, bounds: Bounds, copy: Copy): string => {
  if (status.kind === "ok") return "";
  if (status.kind === "clamped") return copy.limitNote?.(status.used, bounds) ?? "";
  const note = {
    whole: copy.wholeMessage,
    dot: copy.dotMessage,
    large: copy.largeMessage,
    empty: copy.emptyMessage,
  }[status.reason ?? "whole"];
  return (status.reason === undefined ? undefined : note) ?? copy.invalidMessage?.(value) ?? "";
};
