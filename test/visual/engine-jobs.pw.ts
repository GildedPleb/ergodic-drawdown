import { type CDPSession, expect, type Page, test } from "@playwright/test";

// Probe B1 / M1 (FL-001, FL-002) on the real app at 1440×900, Chromium (CDP heap snapshots):
// 300 wheel notches over a focused field step the draft and commit ONCE when the wheel settles,
// the engine runs once, never more than one job is in flight, and the memory the engine's buffers
// hold stays flat. 40 Enter commits keep it flat too. Needs a VITE_DESIGN_ROUTE=1 build (it
// exposes the job counters as window.__v2engine).
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "chromium-1440x900", "Chromium only (CDP), once");
});

type Jobs = {
  requested: number;
  started: number;
  inFlight: number;
  maxInFlight: number;
  waves: number;
};

const jobs = (page: Page): Promise<Jobs> =>
  page.evaluate(() => {
    const read: unknown = Reflect.get(window, "__v2engine");
    if (typeof read !== "function") throw new Error("not a VITE_DESIGN_ROUTE=1 build");
    const out: unknown = read();
    return out as Jobs; // eslint-disable-line typescript/no-unsafe-type-assertion -- test probe
  });

/**
 * Bytes held by ArrayBuffer / SharedArrayBuffer backing stores on the page, after a full GC
 * (heap snapshot "system / JSArrayBufferData" nodes). This is where Probe's 17 MB per commit lived;
 * the JS heap itself stays at ~10 MB and would miss it.
 */
const bufferBytes = async (cdp: CDPSession): Promise<number> => {
  await cdp.send("HeapProfiler.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const chunks: string[] = [];
  const onChunk = ({ chunk }: { chunk: string }): void => {
    chunks.push(chunk);
  };
  cdp.on("HeapProfiler.addHeapSnapshotChunk", onChunk);
  await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
  cdp.off("HeapProfiler.addHeapSnapshotChunk", onChunk);
  const snap: {
    snapshot: { meta: { node_fields: string[] } };
    nodes: number[];
    strings: string[];
  } = JSON.parse(chunks.join(""));
  const fields = snap.snapshot.meta.node_fields;
  const name = fields.indexOf("name");
  const size = fields.indexOf("self_size");
  let total = 0;
  for (let i = 0; i < snap.nodes.length; i += fields.length) {
    if (snap.strings[snap.nodes[i + name] ?? 0] === "system / JSArrayBufferData") {
      total += snap.nodes[i + size] ?? 0;
    }
  }
  return total;
};

const MB = 1024 * 1024;
/** Flat: within two commits' worth of the engine's ~17 MB price buffer of where it started. */
const FLAT_BOUND = 40 * MB;

const idle = async (page: Page): Promise<Jobs> => {
  await expect.poll(async () => (await jobs(page)).inFlight, { timeout: 60_000 }).toBe(0);
  return jobs(page);
};

const openSamples = async (page: Page): Promise<void> => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: /reaches/ })).toBeVisible({ timeout: 60_000 });
  await page.locator("#tab-models").click();
  await page.locator("#row-samples").click();
  await idle(page);
};

test("B1: 300 wheel notches on a focused field commit once, run the engine once, memory flat", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openSamples(page);
  const cdp = await page.context().newCDPSession(page);
  const field = page.locator("#v2-samples");
  const start = Number(await field.inputValue());
  const before = await jobs(page);
  const heapBefore = await bufferBytes(cdp);
  await field.focus();
  await field.hover();
  for (let i = 0; i < 300; i += 1) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(30); // ~30 notches a second: ordinary fast scrolling
  }
  // Mid-spin nothing has committed: the draft moved, the engine did not.
  await expect(field).toHaveValue(String(start + 300));
  const after = await idle(page);
  await expect.poll(async () => (await jobs(page)).requested).toBe(before.requested + 1);
  const settled = await idle(page);
  expect(settled.requested - before.requested).toBe(1);
  expect(settled.started - before.started).toBe(1);
  expect(settled.waves - before.waves).toBe(1);
  expect(after.maxInFlight).toBe(1);
  const heapAfter = await bufferBytes(cdp);
  expect(heapAfter - heapBefore).toBeLessThan(FLAT_BOUND);
  console.log(
    `B1 buffers ${(heapBefore / MB).toFixed(1)} MB -> ${(heapAfter / MB).toFixed(1)} MB; jobs ${JSON.stringify(settled)}`,
  );
});

test("M1: 40 Enter commits run one job at a time and leave the buffers flat", async ({ page }) => {
  test.setTimeout(120_000);
  await openSamples(page);
  const cdp = await page.context().newCDPSession(page);
  const field = page.locator("#v2-samples");
  const heapBefore = await bufferBytes(cdp);
  for (let i = 0; i < 40; i += 1) {
    await field.fill(String(1001 + i));
    await field.press("Enter");
    await page.waitForTimeout(30);
  }
  const settled = await idle(page);
  expect(settled.maxInFlight).toBe(1);
  const heapAfter = await bufferBytes(cdp);
  expect(heapAfter - heapBefore).toBeLessThan(FLAT_BOUND);
  console.log(
    `M1 buffers ${(heapBefore / MB).toFixed(1)} MB -> ${(heapAfter / MB).toFixed(1)} MB; jobs ${JSON.stringify(settled)}`,
  );
});
