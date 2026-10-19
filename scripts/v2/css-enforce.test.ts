import { expect, test } from "bun:test";

import { enforceCss } from "../../scripts/v2/css-enforce";

test("v2 CSS modules satisfy Keel/Form enforcement rules", () => {
  const violations = enforceCss();
  expect(violations).toEqual([]);
});
