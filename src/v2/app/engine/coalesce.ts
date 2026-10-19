/**
 * One engine job at a time (Probe B1 / M1 / m5). The front end hands the engine a config only when
 * the previous one has settled; configs committed meanwhile coalesce to the latest, which starts
 * when the run in flight ends. The engine never aborts a run on v2's account, so nothing an abort
 * logs (and keeps alive) piles up. The engine itself is unchanged: this wraps its public set() and
 * settled().
 */
import type { Engine } from "../../../engine/engine";
import type { EngineConfig } from "../../../engine/keys";

export type EngineJobs = {
  /** Configs v2 asked for (one per commit that changes the config). */
  requested: number;
  /** Configs handed to the engine (each starts at most one run). */
  started: number;
  /** Configs in the engine's hands right now (0 or 1). */
  inFlight: number;
  /** Most configs ever in the engine's hands at once (always 1). */
  maxInFlight: number;
};

export type Coalescer = { set: (config: EngineConfig) => void; jobs: EngineJobs };

export const coalesce = (engine: Pick<Engine, "set" | "settled">): Coalescer => {
  const jobs: EngineJobs = { requested: 0, started: 0, inFlight: 0, maxInFlight: 0 };
  let latest: EngineConfig | null = null;
  const start = (config: EngineConfig): void => {
    jobs.inFlight += 1;
    jobs.started += 1;
    jobs.maxInFlight = Math.max(jobs.maxInFlight, jobs.inFlight);
    engine.set(config);
    void engine.settled().then(() => {
      jobs.inFlight -= 1;
      const next = latest;
      latest = null;
      if (next !== null) start(next);
    });
  };
  return {
    jobs,
    set: (config) => {
      jobs.requested += 1;
      if (jobs.inFlight > 0) {
        latest = config;
        return;
      }
      start(config);
    },
  };
};

/** The engine with set() coalesced; everything else is the engine's own. */
export const coalescedEngine = (engine: Engine): { engine: Engine; jobs: EngineJobs } => {
  const { set, jobs } = coalesce(engine);
  return { engine: { ...engine, set }, jobs };
};
