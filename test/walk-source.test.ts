import { file, Glob } from "bun";
import { expect, test } from "bun:test";

const sourceRoot = `${import.meta.dir}/../src`;
const moduleBinding = /^(?:export\s+)?(?:let|var)\s/m;

const list = (pattern: string, cwd: string): string[] => [
  ...new Glob(pattern).scanSync({ absolute: true, cwd }),
];

test("walks keep their cycle off the module", async () => {
  const paths = list("*.ts", `${sourceRoot}/data/walks`);
  expect(paths.length).toBeGreaterThanOrEqual(9);
  for (const path of paths) {
    const text = await file(path).text();
    expect(moduleBinding.test(text)).toBe(false);
    expect(text.includes("Math.random")).toBe(false);
  }
});

test("workers draw from the seeded stream", async () => {
  const paths = list("**/*.{ts,tsx}", `${sourceRoot}/contexts/workers`);
  expect(paths.length).toBeGreaterThanOrEqual(4);
  for (const path of paths) {
    const text = await file(path).text();
    expect(text.includes("Math.random")).toBe(false);
  }
});
