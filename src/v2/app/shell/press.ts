/**
 * V32-BUILD §1O, the pointer states the stylesheets can't hold on their own.
 */

type Styled = {
  style: { setProperty: (k: string, v: string) => void; removeProperty: (k: string) => void };
};

/**
 * A sheet hold: <html> takes the grabbing cursor and drops text selection for the whole press
 * (rubber-banding and leaving the strip included), and the logo's stroke turns --accent-strong.
 * One switch, set on the press and cleared on release.
 */
export const holdSheet = (root: Styled, held: boolean): void => {
  const props: [string, string][] = [
    ["cursor", "var(--cursor-drag)"],
    ["user-select", "none"],
    ["--logo-stroke", "var(--accent-strong)"],
  ];
  for (const [k, v] of props) {
    if (held) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
};

/** A touch press shows the designed pressed fill for at least this long (a quick tap is seen). */
export const PRESS_MS = 120;

type Pressable = {
  closest: (
    sel: string,
  ) => { animate?: (k: Keyframe[], o: KeyframeAnimationOptions) => unknown } | null;
};

/** What a touch press lights: buttons, tabs, options, the Select field, slider rows. */
const PRESSABLE = 'button, [role="option"], [role="combobox"], [role="tab"]';

/**
 * Touch has no hover: the pressed control fills with --hover (resolved by the caller) from the
 * first frame, for PRESS_MS at least, then fades. Mouse presses are left to the cursor and hover.
 */
export const pressFlash = (
  target: Pressable | null,
  pointerType: string,
  fill: string,
): boolean => {
  if (pointerType === "mouse" || target === null || fill === "") return false;
  const el = target.closest(PRESSABLE);
  if (el === null || typeof el.animate !== "function") return false;
  el.animate([{ backgroundColor: fill }, { backgroundColor: fill, offset: 0.8 }, {}], {
    duration: PRESS_MS * 1.25,
  });
  return true;
};

/**
 * §1O progress: a recompute that runs past `after` ms shows progress on the plot. `start` on a
 * submit, `done` when the bands come back; `onBusy` hears each change.
 */
export const recomputeWatch = (
  after: number,
  onBusy: (busy: boolean) => void,
): { start: () => void; done: () => void } => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    start: () => {
      clear();
      timer = setTimeout(() => {
        timer = undefined;
        onBusy(true);
      }, after);
    },
    done: () => {
      clear();
      onBusy(false);
    },
  };
};

/** §1O: every release (up or cancel, anywhere) drops the sheet hold; returns the detach. */
export const releaseOnUp = (doc: EventTarget, html: Styled): (() => void) => {
  const release = (): void => {
    holdSheet(html, false);
  };
  doc.addEventListener("pointerup", release);
  doc.addEventListener("pointercancel", release);
  return () => {
    release();
    doc.removeEventListener("pointerup", release);
    doc.removeEventListener("pointercancel", release);
  };
};

const isPressable = (t: unknown): t is Pressable =>
  typeof t === "object" && t !== null && typeof Reflect.get(t, "closest") === "function";

/** §1O: the touch pressed state as a document listener (G4); `fill` reads --hover. */
export const attachPressFlash = (doc: EventTarget, fill: () => string): (() => void) => {
  const onPress = (event: Event): void => {
    const type = Reflect.get(event, "pointerType");
    const target: unknown = event.target;
    pressFlash(
      isPressable(target) ? target : null,
      typeof type === "string" ? type : "mouse",
      fill(),
    );
  };
  doc.addEventListener("pointerdown", onPress);
  return () => {
    doc.removeEventListener("pointerdown", onPress);
  };
};
