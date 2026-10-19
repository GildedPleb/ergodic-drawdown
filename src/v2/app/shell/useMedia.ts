import { useSyncExternalStore } from "react";

/** Live matchMedia, for layout the DOM itself must change with (the closed rail's tab column). */
export const useMedia = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => false,
  );

/** The dock / desktop layout breakpoint (AppShell.module.css, 39.75rem). */
export const WIDE = "(min-width: 39.75rem)";

/** V32-BUILD §1e auto rule: dock right when innerWidth > innerHeight and innerHeight ≤ 500. */
export const SIDE_PANEL = "(orientation: landscape) and (max-height: 500px)";
