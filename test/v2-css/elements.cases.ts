import { expect, test } from "bun:test";
import {
  checkElements,
  checkStoryImports,
  checkSuffixBtc,
  checkSuppressions,
  loadAllowlist,
  PENDING_RAW_CONTROLS,
  rawControls,
} from "../../scripts/v2/css/rules";
import { apply, realTree, SHELL_TSX } from "./seed";

const allow = loadAllowlist();

test("G4: no raw <button|input|select> or div-as-control in src/v2/app (pending list may only shrink)", () => {
  expect(checkElements(realTree)).toEqual([]);
  const offenders = new Set(rawControls(realTree).map((v) => v.split(" ")[1]?.replace(/:$/, "")));
  expect([...offenders].toSorted((a, b) => (a ?? "").localeCompare(b ?? ""))).toEqual(
    Object.keys(PENDING_RAW_CONTROLS).toSorted((a, b) => a.localeCompare(b)),
  );
});

test("G4: a raw control in app fails", () => {
  const tree = apply({
    name: "raw button",
    path: SHELL_TSX,
    edit: (c) =>
      c.replace(
        "{children}",
        '{children}<button type="button">x</button><div onClick={() => {}} />',
      ),
  });
  expect(checkElements(tree).length).toBe(2);
});

test("G4: a raw <select> or <input> in the Models pane fails (no exception entry)", () => {
  expect(Object.keys(PENDING_RAW_CONTROLS)).toEqual([]);
  const pane = "app/models/ModelsPane.tsx";
  for (const raw of ['<select value="a" onChange={() => {}} />', '<input type="number" />']) {
    const tree = apply({
      name: raw,
      path: pane,
      edit: (c) =>
        c.replace("<h2 className={title}>Model</h2>", `<h2 className={title}>Model</h2>${raw}`),
    });
    expect(checkElements(tree).length).toBe(1);
  }
});

test("G4: stories stay plain CSF (no @storybook / @ladle imports)", () => {
  expect(checkStoryImports(realTree)).toEqual([]);
  const tree = apply({
    name: "storybook import",
    path: "design/primitives/Stack/Stack.stories.tsx",
    edit: (c) => `import { fn } from "@storybook/test";\nvoid fn;\n${c}`,
  });
  expect(checkStoryImports(tree).length).toBe(1);
});

test("G4: no string literal puts ₿ after a digit", () => {
  expect(checkSuffixBtc(realTree)).toEqual([]);
  const tree = apply({
    name: "suffix",
    path: SHELL_TSX,
    edit: (c) => c.replace("{children}", "{children}13.1 ₿"),
  });
  expect(checkSuffixBtc(tree).length).toBe(1);
});

test("G4: every *-disable comment is listed in lint-allowlist.json", () => {
  expect(checkSuppressions(realTree, allow)).toEqual([]);
  const tree = apply({
    name: "disable",
    path: SHELL_TSX,
    edit: (c) => `// oxlint-disable-next-line no-console\n${c}`,
  });
  expect(checkSuppressions(tree, allow).length).toBe(1);
});
