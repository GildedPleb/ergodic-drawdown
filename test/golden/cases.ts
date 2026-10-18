import { type WalkTypes } from "../../src/data/walks";
import { type DistributionType } from "../../src/types";

export interface CaseInput {
  clampBottom: boolean;
  clampTop: boolean;
  epochs: number;
  fiatCount: number;
  inflation: number;
  items: "default" | "none" | "ten";
  name: string;
  renderDrawdownDistribution: DistributionType;
  renderModelMax: boolean;
  renderModelMin: boolean;
  renderPriceDistribution: DistributionType;
  renderPriceWalks: boolean;
  samples: number;
  showHistoric: boolean;
  showModel: boolean;
  walk: WalkTypes;
  weeksSince: number;
}

const base = (name: string, walk: WalkTypes, clamp: boolean): CaseInput => ({
  clampBottom: clamp,
  clampTop: clamp,
  epochs: 10,
  fiatCount: 0,
  inflation: 8,
  items: "default",
  name,
  renderDrawdownDistribution: "Quantile",
  renderModelMax: true,
  renderModelMin: true,
  renderPriceDistribution: "Quantile",
  renderPriceWalks: false,
  samples: 1000,
  showHistoric: true,
  showModel: false,
  walk,
  weeksSince: 0,
});

const walks: readonly { name: string; walk: WalkTypes }[] = [
  { name: "bubble", walk: "Bubble" },
  { name: "momentum", walk: "Momentum" },
  { name: "pong", walk: "Pong" },
  { name: "random", walk: "Random" },
  { name: "saw", walk: "Saw" },
  { name: "shark", walk: "Shark" },
  { name: "sin", walk: "Sin" },
  { name: "vote", walk: "Vote Count" },
  { name: "cycle", walk: "🟢🟢🟢🔴" },
];

export const coldCases = (): CaseInput[] => {
  const cases: CaseInput[] = [];
  for (const { name, walk } of walks) {
    cases.push(base(`${name}-off`, walk, false));
    cases.push(base(`${name}-clamps`, walk, true));
  }
  cases.push({ ...base("bubble-2000x12", "Bubble", false), epochs: 12, samples: 2000 });
  cases.push({ ...base("bubble-7x3", "Bubble", false), epochs: 3, samples: 7 });
  cases.push({ ...base("bubble-1x1", "Bubble", false), epochs: 1, samples: 1 });
  cases.push({ ...base("bubble-week-80", "Bubble", false), weeksSince: 80 });
  cases.push({ ...base("bubble-week-207", "Bubble", false), weeksSince: 207 });
  cases.push({ ...base("bubble-items-10", "Bubble", false), items: "ten" });
  cases.push({ ...base("bubble-fiat-3", "Bubble", false), fiatCount: 3 });
  cases.push({ ...base("bubble-inflation-7", "Bubble", false), inflation: 7 });
  cases.push({ ...base("bubble-zero-items", "Bubble", false), items: "none" });
  return cases;
};

export const sessionStart = (): CaseInput => base("session-settled", "Bubble", false);

const named = (name: string, baseCase: CaseInput, patch: Partial<CaseInput> = {}): CaseInput => ({
  ...baseCase,
  ...patch,
  name,
});

export const sessionSteps = (): CaseInput[] => {
  const start = sessionStart();
  const walksOn = named("session-price-walks", start, { renderPriceWalks: true });
  const historicOff = named("session-historic-off", walksOn, { showHistoric: false });
  const minOff = named("session-min-off", historicOff, { renderModelMin: false });
  const normal = named("session-normal", minOff, {
    renderDrawdownDistribution: "Normal",
    renderPriceDistribution: "Normal",
  });
  const quantile = named("session-quantile-again", normal, {
    renderDrawdownDistribution: "Quantile",
    renderPriceDistribution: "Quantile",
  });
  const identical = named("session-identical", quantile);
  const wide = named("session-samples-2000", identical, { samples: 2000 });
  const back = named("session-samples-1000", identical, { samples: 1000 });
  const week80 = named("session-week-80", back, { weeksSince: 80 });
  const week0 = named("session-week-0", back, { weeksSince: 0 });
  const shown = named("session-show-model", week0, { showModel: true });
  const none = named("session-distribution-none", week0, {
    renderDrawdownDistribution: "None",
    renderPriceDistribution: "None",
  });
  const zero = named("session-zero-items", none, { items: "none" });
  return [
    start,
    walksOn,
    historicOff,
    minOff,
    normal,
    quantile,
    identical,
    wide,
    back,
    week80,
    week0,
    shown,
    none,
    zero,
  ];
};
