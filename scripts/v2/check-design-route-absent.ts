/**
 * MVP-SPEC G9: a build with VITE_DESIGN_ROUTE unset ships no story module and no design route.
 * 1. Module graph: no chunk contains src/v2/routes/design/** or any *.stories.tsx.
 * 2. Sentinel strings are absent from every emitted asset.
 * 3. The main-entry bytes equal those of a build where the route module is stubbed out (no stories at all).
 * Uses the Vite API with write: false, so it skips the price fetch in `bun run build` and leaves dist/ alone.
 */
import { build, type Rollup } from "vite";

delete process.env["VITE_DESIGN_ROUTE"];
const root = new URL("../..", import.meta.url).pathname;

type Out = Rollup.RollupOutput;
const asOutputs = (result: Awaited<ReturnType<typeof build>>): Out[] => {
  if (Array.isArray(result)) return result;
  if ("output" in result) return [result];
  throw new Error("watcher result not expected");
};

const runBuild = async (stub: boolean): Promise<Out[]> =>
  asOutputs(
    await build({
      root,
      logLevel: "silent",
      mode: "production",
      build: { write: false, emptyOutDir: false },
      plugins: stub
        ? [
            {
              name: "stub-design-route",
              enforce: "pre",
              load(id: string) {
                if (id.includes("/src/v2/routes/design/")) {
                  return "export const DesignRoute = () => null;";
                }
                return null;
              },
            },
          ]
        : [],
    }),
  );

const flagOff = await runBuild(false);
const noStories = await runBuild(true);

const problems: string[] = [];
const needles = ["DesignRoute", "tick-toggle-linen", "No story:"];
for (const out of flagOff) {
  for (const item of out.output) {
    if (item.type === "chunk") {
      for (const id of item.moduleIds) {
        if (id.includes("/src/v2/routes/design/") || id.endsWith(".stories.tsx")) {
          problems.push(`${item.fileName}: bundles ${id.slice(root.length)}`);
        }
      }
    }
    const text = item.type === "chunk" ? item.code : String(item.source);
    if (!/\.(js|css|html)$/.test(item.fileName)) continue;
    for (const needle of needles) {
      if (text.includes(needle)) problems.push(`${item.fileName}: contains "${needle}"`);
    }
  }
}

const entryCode = (outs: Out[]): string => {
  for (const out of outs) {
    for (const item of out.output) if (item.type === "chunk" && item.isEntry) return item.code;
  }
  throw new Error("no entry chunk");
};
const a = entryCode(flagOff);
const b = entryCode(noStories);
if (a !== b) {
  problems.push(`main entry differs from the no-stories build (${a.length} vs ${b.length} bytes)`);
}

if (problems.length > 0) {
  console.error("Design route leaked:\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`OK: design route absent; flag-off entry == no-stories entry (${a.length} bytes)`);
