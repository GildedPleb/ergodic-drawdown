import { expect, test } from "@playwright/test";

// Runs only against a Storybook URL (e.g. `bun run build-storybook` + a static server).
const STORYBOOK = process.env["STORYBOOK_URL"];

test("Storybook TickToggle Default toggles on click, Space and Enter", async ({
  page,
  browserName,
}, info) => {
  test.skip(
    STORYBOOK === undefined || info.project.name !== `${browserName}-1024x768`,
    "set STORYBOOK_URL",
  );
  await page.goto(
    `${STORYBOOK ?? ""}/iframe.html?id=primitives-ticktoggle--default&viewMode=story`,
  );
  const sw = page.getByRole("switch");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.press("Space");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await sw.press("Enter");
  await expect(sw).toHaveAttribute("aria-checked", "true");
});
