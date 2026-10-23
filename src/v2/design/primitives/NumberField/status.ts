/**
 * NumberField's message state (V32-BUILD §1g; Form 4d/4e, 2e/2g). Pure, so the rules are testable
 * without a DOM: the component keeps a Status and renders messageOf it.
 */
import type { Bounds, EntryResult } from "./entry";

/** `reason`: a fraction or stray comma in a count ("whole"), a decimal comma ("dot"), Form 2g. */
export type Status =
  | { kind: "ok" }
  | { kind: "clamped"; used: number }
  | { kind: "invalid"; reason: "whole" | "dot" | undefined };

/** The status after a commit (Enter, blur, a held key, the wheel); `bound`: a step stopped on one. */
export const statusOf = (result: EntryResult, bound: boolean): Status => {
  if (result.kind === "invalid") return { kind: "invalid", reason: result.reason };
  return result.kind === "clamped" || bound
    ? { kind: "clamped", used: result.value }
    : { kind: "ok" };
};

/** Form 4e: the limit note stays (blur included) until the field is next edited. */
export const afterEdit = (status: Status): Status =>
  status.kind === "clamped" ? { kind: "ok" } : status;

export type Copy = {
  /** Form 4d/4e/4f: "Max is 10,000" / "Min is 1.01", whether from Enter or from blur. */
  limitNote?: ((used: number, bounds: Bounds) => string) | undefined;
  invalidMessage?: ((current: number) => string) | undefined;
  /** Form 2g: "Whole numbers only" and "Use a dot for decimals". */
  wholeMessage?: string | undefined;
  dotMessage?: string | undefined;
};

/** The text under the field: the limit note, the 2g note, or the invalid message. */
export const messageOf = (status: Status, value: number, bounds: Bounds, copy: Copy): string => {
  if (status.kind === "ok") return "";
  if (status.kind === "clamped") return copy.limitNote?.(status.used, bounds) ?? "";
  const note = { whole: copy.wholeMessage, dot: copy.dotMessage }[status.reason ?? "whole"];
  return (status.reason === undefined ? undefined : note) ?? copy.invalidMessage?.(value) ?? "";
};
