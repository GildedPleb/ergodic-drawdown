import { expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { enforceCss } from "./css-enforce";

test("v2 CSS modules satisfy Keel/Form enforcement rules", () => {
  const violations = enforceCss();
  expect(violations).toEqual([]);
});

test("rule 7: prefers-* allowed in tokens; viewport media outside shell fails", () => {
  const tmp = join(import.meta.dir, "../../src/v2/.css-enforce-tmp");
  mkdirSync(join(tmp, "design/tokens"), { recursive: true });
  mkdirSync(join(tmp, "design/primitives/Tmp"), { recursive: true });
  mkdirSync(join(tmp, "app"), { recursive: true });
  writeFileSync(
    join(tmp, "design/tokens/motion.css"),
    `@layer tokens { @media (prefers-reduced-motion: reduce) { :root { --x: 0; } } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Tmp/Tmp.module.css"),
    `@layer primitives { .root { margin: 0; } @media (min-width: 40em) { .root { color: var(--text); } } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Tmp/Tmp.tsx"),
    `import styles from "./Tmp.module.css";\nexport const Tmp = () => <div className={styles.root} />;\n`,
  );
  // minimal tokens so undefined-var doesn't fire
  writeFileSync(
    join(tmp, "design/tokens/palette.css"),
    `@layer tokens { :root { --text: #fff; } }\n`,
  );
  const v = enforceCss({ root: tmp });
  rmSync(tmp, { recursive: true, force: true });
  expect(v.some((s) => s.includes("prefers"))).toBe(false);
  expect(v.some((s) => s.includes("viewport @media"))).toBe(true);
});

test("rule 4: bare 2px on outline fails", () => {
  const tmp = join(import.meta.dir, "../../src/v2/.css-enforce-tmp2");
  mkdirSync(join(tmp, "design/tokens"), { recursive: true });
  mkdirSync(join(tmp, "design/primitives/Tmp"), { recursive: true });
  writeFileSync(
    join(tmp, "design/tokens/palette.css"),
    `@layer tokens { :root { --focus: #fff; --focus-w: 2px; } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Tmp/Tmp.module.css"),
    `@layer primitives { .root { margin: 0; outline: 2px solid var(--focus); } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Tmp/Tmp.tsx"),
    `import styles from "./Tmp.module.css";\nexport const Tmp = () => <div className={styles["root"]} />;\n`,
  );
  const v = enforceCss({ root: tmp });
  rmSync(tmp, { recursive: true, force: true });
  expect(v.some((s) => s.includes("bare 2px"))).toBe(true);
});

test("rule 9: non-custom-property inline style fails", () => {
  const tmp = join(import.meta.dir, "../../src/v2/.css-enforce-tmp3");
  mkdirSync(join(tmp, "design/tokens"), { recursive: true });
  mkdirSync(join(tmp, "design/primitives/Tmp"), { recursive: true });
  writeFileSync(
    join(tmp, "design/tokens/palette.css"),
    `@layer tokens { :root { --text: #fff; } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Tmp/Tmp.module.css"),
    `@layer primitives { .root { margin: 0; color: var(--text); } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Tmp/Tmp.tsx"),
    `import styles from "./Tmp.module.css";\nexport const Tmp = () => <div className={styles["root"]} style={{ color: "red" }} />;\n`,
  );
  const v = enforceCss({ root: tmp });
  rmSync(tmp, { recursive: true, force: true });
  expect(v.some((s) => s.includes("only CSS custom properties"))).toBe(true);
});

test("walk-up only in LabelGlyphs", () => {
  const tmp = join(import.meta.dir, "../../src/v2/.css-enforce-tmp4");
  mkdirSync(join(tmp, "design/tokens"), { recursive: true });
  mkdirSync(join(tmp, "design/primitives/Other"), { recursive: true });
  writeFileSync(
    join(tmp, "design/tokens/semantic.css"),
    `@layer tokens { :root { --walk-up: #0f0; --walk-down: #f00; --text: #fff; } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Other/Other.module.css"),
    `@layer primitives { .root { margin: 0; color: var(--walk-up); } }\n`,
  );
  writeFileSync(
    join(tmp, "design/primitives/Other/Other.tsx"),
    `import styles from "./Other.module.css";\nexport const Other = () => <div className={styles["root"]} />;\n`,
  );
  const v = enforceCss({ root: tmp });
  rmSync(tmp, { recursive: true, force: true });
  expect(v.some((s) => s.includes("walk-up"))).toBe(true);
});
