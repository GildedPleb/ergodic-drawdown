import { file, Glob } from "bun";
import { expect, test } from "bun:test";

const v2Root = `${import.meta.dir}/../../src/v2`;

test("v2 does not import old UI panels, components, or contexts", async () => {
  const offenders: string[] = [];
  for (const path of new Glob("**/*.{ts,tsx}").scanSync({ cwd: v2Root, absolute: true })) {
    const text = await file(path).text();
    if (
      /from\s+["'][^"']*\/(components|panels|contexts|styled)(\/|"|')/.test(text) ||
      /from\s+["']\.\.\/\.\.\/(components|panels|contexts|styled)/.test(text)
    ) {
      offenders.push(path);
    }
  }
  expect(offenders).toEqual([]);
});
