import { file, Glob } from "bun";
import { expect, test } from "bun:test";

const primitives = `${import.meta.dir}/../../src/v2/design/primitives`;

const required = ["Default", "Focus", "LongText", "Linen"] as const;
const interactive = ["Disabled", "On", "Off"] as const;

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
