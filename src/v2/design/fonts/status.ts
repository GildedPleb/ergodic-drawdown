/**
 * Runtime fonts-failed detection (BOOK §7 rule 2, §8; Form M8). Once per page: wait for the SM Jost
 * 500 face (the ₿ face) with document.fonts.load, then confirm with document.fonts.check. If it has
 * not loaded within FONT_TIMEOUT_MS, or failed, ₿ must not render in a fallback face: amounts switch
 * to "BTC 0.7" and <html data-fonts="failed"> is set. A late successful load flips back.
 */
import { useSyncExternalStore } from "react";

const PROBE = "500 16px 'SM Jost'";
const PROBE_TEXT = "\u20BF0123456789";
const FONT_TIMEOUT_MS = 3000;

type Status = "pending" | "ok" | "failed";
let status: Status = "pending";
let started = false;
const listeners = new Set<() => void>();

const set = (next: Status): void => {
  if (status === next) return;
  status = next;
  if (typeof document !== "undefined") document.documentElement.dataset["fonts"] = next;
  for (const l of listeners) l();
};

const start = (): void => {
  if (started || typeof document === "undefined" || !("fonts" in document)) return;
  started = true;
  const timer = setTimeout(() => {
    if (status === "pending") set("failed");
  }, FONT_TIMEOUT_MS);
  document.fonts
    .load(PROBE, PROBE_TEXT)
    .then((faces) => {
      clearTimeout(timer);
      set(faces.length > 0 && document.fonts.check(PROBE, PROBE_TEXT) ? "ok" : "failed");
    })
    .catch(() => {
      clearTimeout(timer);
      set("failed");
    });
};

const subscribe = (listener: () => void): (() => void) => {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** True once the SM faces are known to have failed (or timed out). SSR and pending: false. */
export const useFontsFailed = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => status === "failed",
    () => false,
  );
