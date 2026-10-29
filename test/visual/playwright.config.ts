import { defineConfig, devices, type Project } from "@playwright/test";

/**
 * MVP-SPEC §4 / G7 matrix on /design/<group>/<story> (the app route, never Storybook).
 * 5 viewports × 2 engines, plus Chromium at 200% zoom, 200% OS text and reduced motion.
 * Themes are part of the story id (…/linen sets data-theme on <html>).
 * Baselines: test/visual/__screenshots__, generated only in the box Chromium pinned by
 * @playwright/test 1.64.1, no containers (README); Form reviews, the user applies `design-approved`.
 */
const VIEWPORTS = {
  "390x844": { width: 390, height: 844 },
  "844x390": { width: 844, height: 390 },
  "1024x768": { width: 1024, height: 768 },
  "1440x900": { width: 1440, height: 900 },
  "1920x1080": { width: 1920, height: 1080 },
} as const;

const ENGINES = {
  chromium: devices["Desktop Chrome"],
  webkit: devices["Desktop Safari"],
} as const;

const projects: Project[] = [];
for (const [engine, device] of Object.entries(ENGINES)) {
  for (const [size, viewport] of Object.entries(VIEWPORTS)) {
    // Form N5: one retry absorbs WebKit navigation flakes; Chromium stays strict.
    projects.push({
      name: `${engine}-${size}`,
      use: { ...device, viewport },
      ...(engine === "webkit" && { retries: 1 }),
    });
  }
}
projects.push(
  // 200% browser zoom ≈ half the CSS viewport at 2× device pixels.
  {
    name: "chromium-zoom200",
    use: { ...ENGINES.chromium, viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 },
  },
  // OS text at 200%: root font-size 32px (the spec injects it).
  { name: "chromium-text200", use: { ...ENGINES.chromium, viewport: VIEWPORTS["1024x768"] } },
  {
    name: "chromium-reduced-motion",
    use: { ...ENGINES.chromium, viewport: VIEWPORTS["390x844"], reducedMotion: "reduce" },
  },
);

const port = 4173;
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.pw.ts",
  outputDir: "../../test-results",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: true,
  reporter: [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" } },
  use: {
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  projects,
  ...(process.env["PLAYWRIGHT_BASE_URL"] === undefined && {
    webServer: {
      // Flag-on build, preview bound to 127.0.0.1 so the URL above always connects (m7).
      command: `VITE_DESIGN_ROUTE=1 bunx vite build && bunx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
      cwd: "../..",
      url: `http://127.0.0.1:${port}/design/tick-row`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  }),
});
