import { type CDPSession, expect, type Page, test } from "@playwright/test";

// Probe B1 / M1 on the real app at 1440×900, Chromium (CDP heap snapshots): a wheel flood and a
// 10 s held key render live (throttled), never more than one job is in flight, superseded configs
// are dropped, and the memory the engine's buffers hold stays flat. 40 Enter commits keep it flat too. Needs a VITE_DESIGN_ROUTE=1 build (it
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
  await page.locator("#asset-bitcoin").click(); // §1M: the settings live in the open row
  await page.locator("#row-samples").click();
  await idle(page);
};

// Oct 20 (user): held steps and the wheel render live. Commits land at most every HELD_COMMIT_MS
// (100 ms) while held plus one trailing commit; the coalescer keeps one job in flight and drops
// superseded configs, so the engine starts far fewer runs than steps and memory stays flat.
test("B1: a 300-notch wheel flood renders live, one job in flight, final value runs, memory flat", async ({
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
  const t0 = Date.now();
  for (let i = 0; i < 300; i += 1) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(30); // ~30 notches a second: ordinary fast scrolling
  }
  const spun = Date.now() - t0;
  const mid = await jobs(page);
  // Mid-spin the engine already moved (live), but never once per notch.
  expect(mid.started - before.started).toBeGreaterThan(1);
  expect(mid.requested - before.requested).toBeLessThanOrEqual(Math.ceil(spun / 100) + 2);
  await expect(field).toHaveValue(String(start + 300));
  const settled = await idle(page);
  expect(settled.maxInFlight).toBe(1);
  expect(settled.started).toBeLessThanOrEqual(settled.requested);
  const heapAfter = await bufferBytes(cdp);
  expect(heapAfter - heapBefore).toBeLessThan(FLAT_BOUND);
  console.log(
    `B1 wheel ${spun} ms; buffers ${(heapBefore / MB).toFixed(1)} MB -> ${(heapAfter / MB).toFixed(1)} MB; jobs ${JSON.stringify({ before, mid, settled })}`,
  );
});

test("held ArrowUp for 10 s renders live every ~100 ms, one trailing commit, memory flat", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openSamples(page);
  const cdp = await page.context().newCDPSession(page);
  const field = page.locator("#v2-samples");
  const start = Number(await field.inputValue());
  await field.focus();
  const before = await jobs(page);
  const heapBefore = await bufferBytes(cdp);
  // Time from the first held step to the first engine run that finishes (a wave lands).
  const t0 = Date.now();
  await page.keyboard.down("ArrowUp");
  await expect
    .poll(async () => (await jobs(page)).waves, { intervals: [5], timeout: 10_000 })
    .toBeGreaterThan(before.waves);
  const firstWave = Date.now() - t0;
  const waveTimes: number[] = [];
  let lastWaves = (await jobs(page)).waves;
  let steps = 1;
  while (Date.now() - t0 < 10_000) {
    await page.keyboard.down("ArrowUp"); // OS key repeat: one keydown every ~33 ms
    steps += 1;
    await page.waitForTimeout(33);
    const now = await jobs(page);
    if (now.waves > lastWaves) waveTimes.push(Date.now() - t0);
    lastWaves = now.waves;
    expect(now.inFlight).toBeLessThanOrEqual(1);
  }
  const held = await jobs(page);
  await page.keyboard.up("ArrowUp");
  await expect(field).toHaveValue(String(start + steps));
  const settled = await idle(page);
  const gaps = waveTimes.slice(1).map((t, i) => t - (waveTimes[i] ?? 0));
  const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
  expect(settled.maxInFlight).toBe(1);
  expect(held.requested - before.requested).toBeLessThanOrEqual(Math.ceil(10_000 / 100) + 2);
  // Exactly one trailing commit on release (the last throttled one may already carry the value).
  expect(settled.requested - held.requested).toBeLessThanOrEqual(1);
  expect(waveTimes.length).toBeGreaterThan(5);
  const heapAfter = await bufferBytes(cdp);
  expect(heapAfter - heapBefore).toBeLessThan(FLAT_BOUND);
  console.log(
    `HOLD steps ${steps}; first render ${firstWave} ms; renders while held ${waveTimes.length}, median gap ${median} ms; buffers ${(heapBefore / MB).toFixed(1)} -> ${(heapAfter / MB).toFixed(1)} MB; jobs ${JSON.stringify({ before, held, settled })}`,
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
