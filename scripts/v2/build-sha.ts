/**
 * Probe N5: tie a deploy to a commit. The build writes the commit into the page as
 * `<meta name="build-sha" content="…">` and into `/version.txt`, and touches nothing else.
 * Netlify sets COMMIT_REF; elsewhere `git rev-parse HEAD`; failing both, "unknown".
 */
import { spawnSync } from "node:child_process";

import type { Plugin } from "vite";

const SHA = /^[0-9a-f]{7,64}$/u;

/** The commit to stamp: COMMIT_REF, then `git rev-parse HEAD` in `cwd`, then "unknown". */
export const resolveBuildSha = (env: Record<string, string | undefined>, cwd: string): string => {
  const fromEnv = env["COMMIT_REF"]?.trim().toLowerCase();
  if (fromEnv !== undefined && SHA.test(fromEnv)) return fromEnv;
  // A git hook exports GIT_DIR and friends, which would override `cwd`; ask about `cwd` only.
  const gitEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  );
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", env: gitEnv });
  const fromGit = git.status === 0 ? git.stdout.trim() : "";
  return SHA.test(fromGit) ? fromGit : "unknown";
};

/** Build only: the meta tag at the end of <head>, and version.txt beside index.html. */
export const buildSha = (sha: string): Plugin => ({
  name: "build-sha",
  apply: "build",
  transformIndexHtml: () => [
    { tag: "meta", attrs: { name: "build-sha", content: sha }, injectTo: "head" },
  ],
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.txt", source: `${sha}\n` });
  },
});
