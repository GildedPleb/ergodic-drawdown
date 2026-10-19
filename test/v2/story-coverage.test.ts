import { file, Glob } from "bun";
import { expect, test } from "bun:test";

const primitives = `${import.meta.dir}/../../src/v2/design/primitives`;

const required = ["Default", "Focus", "LongText", "Linen"] as const;
const interactive = ["Disabled", "On", "Off"] as const;
/** Keel: form-control primitives cover default, focus, disabled, invalid, long label, emoji label. */
const formControl = ["Disabled", "Invalid", "EmojiLabel"] as const;
const FORM_CONTROLS = ["Select", "NumberField"] as const;

test("every primitive has required CSF story exports", async () => {
  const missing: string[] = [];
  for (const path of new Glob("**/*.stories.tsx").scanSync({ cwd: primitives, absolute: true })) {
    const text = await file(path).text();
    const name = path.split("/").pop() ?? path;
    for (const exp of required) {
      if (!new RegExp(`export const ${exp}\\b`).test(text)) {
        missing.push(`${name}: ${exp}`);
      }
    }
    if (FORM_CONTROLS.some((c) => name === `${c}.stories.tsx`)) {
      for (const exp of formControl) {
        if (!new RegExp(`export const ${exp}\\b`).test(text)) missing.push(`${name}: ${exp}`);
      }
    }
    if (name.startsWith("TickToggle")) {
      for (const exp of interactive) {
        if (!new RegExp(`export const ${exp}\\b`).test(text)) {
          missing.push(`${name}: ${exp}`);
        }
      }
    }
  }
  expect(missing).toEqual([]);
});

test("Select and NumberField primitives exist with stories", async () => {
  for (const c of FORM_CONTROLS) {
    expect((await file(`${primitives}/${c}/${c}.stories.tsx`).text()).length > 0).toBe(true);
    expect((await file(`${primitives}/${c}/${c}.module.css`).text()).length > 0).toBe(true);
  }
});
