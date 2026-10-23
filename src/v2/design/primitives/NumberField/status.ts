/**
 * NumberField's message state (V32-BUILD §1g; Form 4d, 2e). Pure, so the rules are testable
 * without a DOM: the component keeps a Status and renders messageOf it.
 */
import type { Bounds, EntryResult } from "./entry";

/** `note`: a clamp committed with focus (Form 4d); `whole`: a stray comma in a count (Form 2e). */
export type Status =
  | { kind: "ok" }
  | { kind: "clamped"; used: number; note: boolean }
  | { kind: "invalid"; whole: boolean };

/** The status after a commit; `bound`: a step stopped on a bound (m6); `focused`: not on blur. */
export const statusOf = (result: EntryResult, bound: boolean, focused: boolean): Status => {
  if (result.kind === "invalid") return { kind: "invalid", whole: result.whole === true };
  return result.kind === "clamped" || bound
    ? { kind: "clamped", used: result.value, note: focused }
    : { kind: "ok" };
};

/** Form 4d: the limit note lasts until the field changes or loses focus; nothing else clears. */
export const afterEdit = (status: Status): Status =>
  status.kind === "clamped" && status.note ? { kind: "ok" } : status;

export type Copy = {
  clampMessage?: ((used: number, bounds: Bounds) => string) | undefined;
  limitNote?: ((used: number, bounds: Bounds) => string) | undefined;
  invalidMessage?: ((current: number) => string) | undefined;
  wholeMessage?: string | undefined;
};

/** The text under the field: the limit note or the §1g clamp message, the 2e or invalid note. */
export const messageOf = (status: Status, value: number, bounds: Bounds, copy: Copy): string => {
  if (status.kind === "invalid") {
    return (status.whole ? copy.wholeMessage : undefined) ?? copy.invalidMessage?.(value) ?? "";
  }
  if (status.kind === "ok") return "";
  const say = (status.note ? copy.limitNote : undefined) ?? copy.clampMessage;
  return say?.(status.used, bounds) ?? "";
};
