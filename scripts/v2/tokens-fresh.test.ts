import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { renderTokens, TOKEN_CSS_FILES } from "./render-tokens";

const tokensDir = join(import.meta.dir, "../../src/v2/design/tokens");

test("G1: tokens.ts is byte-identical to a fresh generation from the token CSS", () => {
  const texts = TOKEN_CSS_FILES.map((f) => readFileSync(join(tokensDir, f), "utf8"));
  expect(readFileSync(join(tokensDir, "tokens.ts"), "utf8")).toBe(renderTokens(texts));
});
