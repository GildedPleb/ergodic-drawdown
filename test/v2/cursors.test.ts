import { file, Glob } from "bun";
import { expect, test } from "bun:test";

import {
  attachPressFlash,
  holdSheet,
  PRESS_MS,
  pressFlash,
  recomputeWatch,
  releaseOnUp,
} from "../../src/v2/app/shell/press";

// V32-BUILD §1O: system cursors only, all mapped in the cursor tokens.
const V2 = `${import.meta.dir}/../../src/v2`;
const cssFiles = (): string[] => [...new Glob("**/*.css").scanSync({ cwd: V2, absolute: true })];
const SYSTEM = new Set([
  "pointer",
  "grab",
  "grabbing",
  "crosshair",
  "progress",
  "text",
  "not-allowed",
]);

test("1O: the cursor tokens are system shapes, and every other cursor reads one", async () => {
  const motion = await file(`${V2}/design/tokens/motion-etc.css`).text();
  const tokens = [...motion.matchAll(/--cursor-([a-z]+):\s*([a-z-]+);/g)];
  expect(tokens.length).toBe(7);
  for (const [, , value] of tokens) expect(SYSTEM.has(value ?? "")).toBe(true);
  const names = new Set(tokens.map(([, name]) => `--cursor-${name ?? ""}`));
  let uses = 0;
  for (const path of cssFiles()) {
    if (path.includes("/tokens/")) continue;
    for (const [, value] of (await file(path).text()).matchAll(/(?<![-\w])cursor:\s*([^;]+);/g)) {
      uses += 1;
      const ref = /^var\((--[a-z-]+)\)$/.exec(value?.trim() ?? "")?.[1] ?? "";
      expect(names.has(ref) || ref === "--dyn-plot").toBe(true);
    }
  }
  expect(uses).toBeGreaterThanOrEqual(13);
});

test("1O: hover styles sit inside (hover: hover) and (pointer: fine)", async () => {
  for (const path of cssFiles()) {
    const css = await file(path).text();
    const at = css.indexOf(":hover");
    if (at < 0) continue;
    expect(css.lastIndexOf("@media (hover: hover) and (pointer: fine)", at)).toBeGreaterThanOrEqual(
      0,
    );
  }
});

const fakeRoot = (): {
  style: Map<string, string> & {
    setProperty: (k: string, v: string) => void;
    removeProperty: (k: string) => void;
  };
} => {
  const map = new Map<string, string>();
  return {
    style: Object.assign(map, {
      setProperty: (k: string, v: string) => {
        map.set(k, v);
      },
      removeProperty: (k: string) => {
        map.delete(k);
      },
    }),
  };
};

test("1O: a sheet hold sets grabbing, no selection and the strong logo stroke on <html>; release clears all three", () => {
  const root = fakeRoot();
  holdSheet(root, true);
  expect(root.style.get("cursor")).toBe("var(--cursor-drag)");
  expect(root.style.get("user-select")).toBe("none");
  expect(root.style.get("--logo-stroke")).toBe("var(--accent-strong)");
  holdSheet(root, false);
  expect(root.style.size).toBe(0);
});

test("1O: a touch press fills its control for at least 100ms; mouse, nothing pressable or no fill do nothing", () => {
  const calls: { k: Keyframe[]; o: KeyframeAnimationOptions }[] = [];
  const el = {
    animate: (k: Keyframe[], o: KeyframeAnimationOptions) => {
      calls.push({ k, o });
    },
  };
  const target = { closest: (sel: string) => (sel.includes("button") ? el : null) };
  expect(pressFlash(target, "touch", "#123")).toBe(true);
  const [first] = calls;
  expect(first?.k[0]?.["backgroundColor"]).toBe("#123");
  const hold = (first?.k[1]?.offset ?? 0) * Number(first?.o.duration ?? 0);
  expect(hold).toBeGreaterThanOrEqual(100);
  expect(PRESS_MS).toBeGreaterThanOrEqual(100);
  expect(pressFlash(target, "mouse", "#123")).toBe(false);
  expect(pressFlash(null, "touch", "#123")).toBe(false);
  expect(pressFlash(target, "pen", "")).toBe(false);
  expect(pressFlash({ closest: () => null }, "touch", "#123")).toBe(false);
  expect(pressFlash({ closest: () => ({}) }, "touch", "#123")).toBe(false);
  expect(calls.length).toBe(1);
});

test("1O: progress shows only once a recompute outlasts its delay, and clears when it lands", async () => {
  const seen: boolean[] = [];
  const watch = recomputeWatch(5, (b) => {
    seen.push(b);
  });
  watch.start();
  watch.done();
  expect(seen).toEqual([false]);
  watch.start();
  watch.start();
  await new Promise((r) => setTimeout(r, 15));
  expect(seen).toEqual([false, true]);
  watch.done();
  expect(seen).toEqual([false, true, false]);
});

const pointer = (type: string, init: Record<string, unknown> = {}): Event =>
  Object.assign(new Event(type), init);

test("1O: any release, up or cancel, drops the hold; detach drops it too and stops listening", () => {
  const doc = new EventTarget();
  const root = fakeRoot();
  const detach = releaseOnUp(doc, root);
  holdSheet(root, true);
  doc.dispatchEvent(pointer("pointerup"));
  expect(root.style.size).toBe(0);
  holdSheet(root, true);
  doc.dispatchEvent(pointer("pointercancel"));
  expect(root.style.size).toBe(0);
  holdSheet(root, true);
  detach();
  expect(root.style.size).toBe(0);
  holdSheet(root, true);
  doc.dispatchEvent(pointer("pointerup"));
  expect(root.style.size).toBe(3);
});

test("1O: the document press listener flashes touch presses only, until detached", () => {
  const doc = new EventTarget();
  let flashes = 0;
  const el = {
    animate: () => {
      flashes += 1;
    },
  };
  const target = { closest: () => el };
  const detach = attachPressFlash(doc, () => "#123");
  const press = (init: Record<string, unknown>): void => {
    const e = new Event("pointerdown");
    Object.defineProperty(e, "target", { value: init["target"] });
    if ("pointerType" in init)
      Object.defineProperty(e, "pointerType", { value: init["pointerType"] });
    doc.dispatchEvent(e);
  };
  press({ target, pointerType: "touch" });
  press({ target, pointerType: "mouse" });
  press({ target });
  press({ target: null, pointerType: "touch" });
  expect(flashes).toBe(1);
  detach();
  press({ target, pointerType: "touch" });
  expect(flashes).toBe(1);
});
