import { file, Glob } from "bun";
import { expect, test } from "bun:test";

const v2Root = `${import.meta.dir}/../../src/v2`;

// Keel (Slice 1 review): main's pure compute modules under contexts/computed/ (no React, no state)
// may be imported read-only, so v2 reads the engine's labels instead of copying them.
const offends = (text: string): boolean => {
  const t = text.replaceAll(/\/contexts\/computed\//g, "/engine-compute/");
  return (
    /from\s+["'][^"']*\/(components|panels|contexts|styled)(\/|"|')/.test(t) ||
    /from\s+["']\.\.\/\.\.\/(components|panels|contexts|styled)/.test(t)
  );
};

test("v2 does not import old UI panels, components, or contexts", async () => {
  const offenders: string[] = [];
  for (const path of new Glob("**/*.{ts,tsx}").scanSync({ cwd: v2Root, absolute: true })) {
    if (offends(await file(path).text())) {
      offenders.push(path);
    }
  }
  expect(offenders).toEqual([]);
});

test("v2 still may not import old UI contexts; only contexts/computed/ is read-only allowed", () => {
  expect(offends('import { useModel } from "../../../contexts/model";')).toBe(true);
  expect(offends('import { bandConfig } from "../../../contexts/computed/distribution";')).toBe(
    false,
  );
});
