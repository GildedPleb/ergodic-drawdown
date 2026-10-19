import { defineConfig, devices } from "@playwright/test";

/** Skeleton — full Form matrix on PR previews only. */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  use: {
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
