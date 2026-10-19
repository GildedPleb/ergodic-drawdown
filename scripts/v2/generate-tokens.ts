/** Generate src/v2/design/tokens/tokens.ts from Form's CSS custom properties. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { renderTokens, TOKEN_CSS_FILES } from "./render-tokens";

const tokensDir = join(import.meta.dir, "../../src/v2/design/tokens");
const outPath = join(tokensDir, "tokens.ts");
const texts = TOKEN_CSS_FILES.map((f) => readFileSync(join(tokensDir, f), "utf8"));
writeFileSync(outPath, renderTokens(texts));
console.log(`wrote ${outPath}`);
