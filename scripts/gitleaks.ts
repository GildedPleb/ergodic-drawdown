import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { arch, platform } from "node:os";
import { join } from "node:path";

const version = "8.30.1";
const cacheDir = join("node_modules", ".cache", "gitleaks");
const binaryPath = join(cacheDir, "gitleaks");

const releaseAssets = {
  darwin_arm64: "b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5",
  darwin_x64: "dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709",
  linux_arm64: "e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080",
  linux_x64: "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
} as const;

type AssetSuffix = keyof typeof releaseAssets;

const assetSuffix = (): AssetSuffix => {
  const os = platform();
  const cpu = arch();
  if (os === "darwin" && cpu === "arm64") return "darwin_arm64";
  if (os === "darwin" && cpu === "x64") return "darwin_x64";
  if (os === "linux" && cpu === "arm64") return "linux_arm64";
  if (os === "linux" && cpu === "x64") return "linux_x64";
  throw new Error(`gitleaks ${version} has no binary for ${os} ${cpu}`);
};

const reportedVersion = (path: string): string => {
  const run = spawnSync(path, ["version"], { encoding: "utf8" });
  if (run.status !== 0) return "";
  return `${run.stdout}${run.stderr}`;
};

const install = async (): Promise<void> => {
  const suffix = assetSuffix();
  const asset = `gitleaks_${version}_${suffix}.tar.gz`;
  const url = `https://github.com/gitleaks/gitleaks/releases/download/v${version}/${asset}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`gitleaks download failed: ${response.status} ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== releaseAssets[suffix]) {
    throw new Error(`gitleaks checksum mismatch for ${asset}`);
  }
  mkdirSync(cacheDir, { recursive: true });
  const archivePath = join(cacheDir, asset);
  writeFileSync(archivePath, bytes);
  const listing = spawnSync("tar", ["-tzf", archivePath], { encoding: "utf8" });
  if (listing.status !== 0) {
    rmSync(archivePath, { force: true });
    throw new Error(`gitleaks archive could not be listed: ${listing.stderr}`);
  }
  const entry = listing.stdout
    .split("\n")
    .find((line) => line === "gitleaks" || line.endsWith("/gitleaks"));
  if (entry === undefined) {
    rmSync(archivePath, { force: true });
    throw new Error("gitleaks archive has no binary");
  }
  const extracted = spawnSync("tar", ["-xzf", archivePath, "-C", cacheDir, entry], {
    encoding: "utf8",
  });
  rmSync(archivePath, { force: true });
  if (extracted.status !== 0) {
    throw new Error(`gitleaks archive could not be extracted: ${extracted.stderr}`);
  }
  const extractedPath = join(cacheDir, entry);
  chmodSync(extractedPath, 0o755);
  if (extractedPath !== binaryPath) {
    throw new Error(`gitleaks archive unpacked to ${entry}`);
  }
};

if (existsSync(binaryPath) && !reportedVersion(binaryPath).includes(version)) {
  rmSync(binaryPath, { force: true });
}
if (!existsSync(binaryPath)) {
  await install();
}
if (!reportedVersion(binaryPath).includes(version)) {
  throw new Error(`installed gitleaks is not ${version}`);
}

const command = process.argv[2];
if (command === undefined) {
  throw new Error("gitleaks needs a subcommand");
}
const scan = spawnSync(
  binaryPath,
  [command, "--config", ".gitleaks.toml", ...process.argv.slice(3)],
  {
    stdio: "inherit",
  },
);
process.exit(scan.status ?? 1);
