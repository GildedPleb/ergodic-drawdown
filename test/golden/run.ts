import { measureRuntime } from "./measure";

const runtime = "Bun" in globalThis ? "bun" : "node";
const result = measureRuntime();
console.log(`GOLDEN_RESULT ${JSON.stringify({ result, runtime })}`);
