import { file, Glob } from "bun";
import { expect, test } from "bun:test";

const primitives = `${import.meta.dir}/../../src/v2/design/primitives`;

const required = ["Default", "Focus", "LongText", "Linen"] as const;
/**
 * Form nit (dedupe): primitives with nothing focusable skip Focus, and fixed-length ones skip
 * LongText, instead of carrying stories identical to Default.
 */
const SKIP: Record<string, readonly string[]> = {
  "Icon.stories.tsx": ["Focus", "LongText"],
  "Amount.stories.tsx": ["Focus", "LongText"],
  "VisuallyHidden.stories.tsx": ["Focus", "LongText"],
  "SectionLabel.stories.tsx": ["Focus"],
  "LabelGlyphs.stories.tsx": ["Focus"],
};
const interactive = ["Disabled", "On", "Off"] as const;
/** Keel: form-control primitives cover default, focus, disabled, invalid, long label, emoji label. */
const formControl = ["Disabled", "Invalid", "EmojiLabel"] as const;
const FORM_CONTROLS = ["NumberField"] as const;

test("every primitive has required CSF story exports", async () => {
  const missing: string[] = [];
  for (const path of new Glob("**/*.stories.tsx").scanSync({ cwd: primitives, absolute: true })) {
    const text = await file(path).text();
    const name = path.split("/").pop() ?? path;
    for (const exp of required) {
      if (SKIP[name]?.includes(exp) === true) continue;
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

test("the NumberField primitive exists with stories", async () => {
  for (const c of FORM_CONTROLS) {
    expect((await file(`${primitives}/${c}/${c}.stories.tsx`).text()).length > 0).toBe(true);
    expect((await file(`${primitives}/${c}/${c}.module.css`).text()).length > 0).toBe(true);
  }
});

/** Form B1: the visual matrix shoots every story of these groups (plus the models pane). */
const MATRIX_GROUPS: Record<string, string> = {
  "tick-row": "TickToggle",
  "number-field": "NumberField",
  "label-glyphs": "LabelGlyphs",
  amount: "Amount",
  "section-label": "SectionLabel",
  select: "Select",
};

const kebab = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

test("Form B1/N5: FIELD_STORIES lists every TickToggle, NumberField, LabelGlyphs, Amount and SectionLabel story", async () => {
  // Read as text: test/visual is the Playwright project, outside the app tsconfig.
  const stories = await file(`${import.meta.dir}/../visual/stories.ts`).text();
  const block = /FIELD_STORIES = \[([\s\S]*?)\] as const/.exec(stories)?.[1] ?? "";
  const FIELD_STORIES = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
  const want: string[] = [
    "models-sheet/default",
    "models-sheet/emoji-walk",
    "models-sheet/linen",
    "models-sheet/editing",
    "models-sheet/collapsed",
    "models-sheet/sp",
    "models-sheet/cagr",
  ];
  for (const [group, c] of Object.entries(MATRIX_GROUPS)) {
    const text = await file(`${primitives}/${c}/${c}.stories.tsx`).text();
    for (const m of text.matchAll(/export const (\w+)/g))
      want.push(`${group}/${kebab(m[1] ?? "")}`);
  }
  expect([...FIELD_STORIES].toSorted()).toEqual(want.toSorted());
});
