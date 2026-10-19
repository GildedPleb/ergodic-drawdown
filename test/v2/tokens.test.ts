import { file } from "bun";
import { expect, test } from "bun:test";

import { token, tokenNames, tokens } from "../../src/v2/design/tokens/tokens";

const tokensDir = `${import.meta.dir}/../../src/v2/design/tokens`;

test("generated tokens.ts matches CSS custom properties", async () => {
  const found = new Set<string>();
  for (const name of ["palette.css", "semantic.css", "motion-etc.css", "type.css", "space.css"]) {
    const text = await file(`${tokensDir}/${name}`).text();
    for (const m of text.matchAll(/--([a-z0-9-]+)\s*:/gi)) {
      if (m[1] !== undefined) found.add(m[1]);
    }
  }
  expect([...found].toSorted()).toEqual([...tokenNames].toSorted());
});

test("token() returns var(--name)", () => {
  expect(token("btc")).toBe("var(--btc)");
  expect(tokens["accent"]).toBe("var(--accent)");
});

test("v2 token CSS does not reference Inter or JetBrains Mono", async () => {
  let css = "";
  for (const name of [
    "palette.css",
    "semantic.css",
    "motion-etc.css",
    "type.css",
    "space.css",
    "tokens.css",
  ]) {
    css += await file(`${tokensDir}/${name}`).text();
  }
  expect(css.toLowerCase().includes("inter")).toBe(false);
  expect(css.toLowerCase().includes("jetbrains")).toBe(false);
});
