import { coldCases, sessionSteps, type CaseInput } from "./cases";
import { createMemory, goldenPins, settle, type CaseSnapshot } from "./settle";

declare const process: {
  env: Record<string, string | undefined>;
  exit(code: number): never;
};

const wanted = (): Set<string> | null => {
  const only = process.env["GOLDEN_ONLY"];
  if (only === undefined || only === "") return null;
  return new Set(only.split(",").filter((name) => name !== ""));
};

const take = (cases: readonly CaseInput[], only: Set<string> | null): CaseInput[] =>
  only === null ? [...cases] : cases.filter((item) => only.has(item.name));

const capture = async (): Promise<void> => {
  const only = wanted();
  const cold = take(coldCases(), only);
  const session = take(sessionSteps(), only);
  if (only !== null) {
    const found = new Set([...cold, ...session].map((item) => item.name));
    for (const name of only) {
      if (!found.has(name)) throw new Error(`unknown golden case ${name}`);
    }
  }

  const cases: CaseSnapshot[] = [];
  for (const item of cold) {
    const started = performance.now();
    cases.push(await settle(item, createMemory(item.epochs, item.samples)));
    console.error(`settle ${item.name} ${Math.round(performance.now() - started)}ms`);
  }
  if (session.length > 0) {
    const first = session[0];
    if (first === undefined) throw new Error("missing session case");
    const memory = createMemory(first.epochs, first.samples);
    for (const item of session) {
      const started = performance.now();
      cases.push(await settle(item, memory));
      console.error(`settle ${item.name} ${Math.round(performance.now() - started)}ms`);
    }
  }

  const runtime = "Bun" in globalThis ? "bun" : "node";
  console.log(`GOLDEN_CAPTURE ${JSON.stringify({ ...goldenPins, cases, runtime })}`);
};

capture().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
