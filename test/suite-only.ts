declare const process: {
  env: Record<string, string | undefined>;
  exit(code: number): never;
};

if (process.env["SUITE"] !== "1") {
  console.error("Run bun run test.");
  process.exit(1);
}

// A test that needs a response assigns its own fetch. Nothing in this suite calls the network.
globalThis.fetch = () => Promise.reject(new Error("tests do not call the network"));
