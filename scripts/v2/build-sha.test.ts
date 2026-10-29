import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "bun:test";
import { build } from "vite";

import { buildSha, resolveBuildSha } from "./build-sha";

const repo = join(import.meta.dir, "../..");
const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();
const SHA = "0123456789abcdef0123456789abcdef01234567";

test("N5: COMMIT_REF wins, then git HEAD, then unknown", () => {
  expect(resolveBuildSha({ COMMIT_REF: SHA }, repo)).toBe(SHA);
  expect(resolveBuildSha({}, repo)).toBe(head);
  expect(resolveBuildSha({ COMMIT_REF: "" }, repo)).toBe(head);
  const bare = mkdtempSync(join(tmpdir(), "build-sha-"));
  try {
    expect(resolveBuildSha({}, bare)).toBe("unknown");
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});

test("N5: a build stamps <meta name=build-sha> into index.html and emits version.txt", async () => {
  const root = mkdtempSync(join(tmpdir(), "build-sha-"));
  try {
    writeFileSync(
      join(root, "index.html"),
      "<!doctype html><html><head><title>t</title></head><body></body></html>\n",
    );
    const out = await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [buildSha(SHA)],
      build: { write: false },
    });
    const files = new Map(
      (Array.isArray(out) ? out : "output" in out ? [out] : [])
        .flatMap((o) => o.output)
        .map((f) => [f.fileName, f.type === "asset" ? String(f.source) : f.code] as const),
    );
    expect(files.get("version.txt")).toBe(`${SHA}\n`);
    expect(
      /<head>[\s\S]*<meta name="build-sha" content="0123456789abcdef0123456789abcdef01234567">[\s\S]*<\/head>/u.test(
        files.get("index.html") ?? "",
      ),
    ).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
