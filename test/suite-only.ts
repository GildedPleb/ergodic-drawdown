declare const process: {
  env: Record<string, string | undefined>;
  exit(code: number): never;
};

if (process.env["SUITE"] !== "1") {
  console.error("Run bun run test.");
  process.exit(1);
}
