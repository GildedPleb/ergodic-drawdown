import { MS_PER_YEAR } from "../src/constants";
import { type EngineConfig } from "../src/engine/keys";
import { weeksSinceLastHalving } from "../src/halvings";
import { legacySpan } from "../src/horizon";
import { type DistributionType } from "../src/types";

const halvings = {
  "210000": 1_354_116_278,
  "420000": 1_468_082_773,
  "630000": 1_589_225_023,
  "840000": 1_713_571_767,
};

export const engineConfig = (
  patch: {
    distribution?: DistributionType;
    epochs?: number;
    items?: boolean;
    pinnedWeeks?: number | null;
    samples?: number;
    showModel?: boolean;
    years?: number;
  } = {},
): EngineConfig => ({
  currentBlock: 840_000,
  currentPrice: 64_000,
  halvings,
  inflation: { annualPercent: 8, mode: "constant" },
  interim: [],
  now: Date.now(),
  pinnedWeeks:
    patch.years === undefined
      ? (patch.pinnedWeeks ?? legacySpan(patch.epochs ?? 1, weeksSinceLastHalving(halvings)))
      : (patch.pinnedWeeks ?? null),
  render: {
    renderDrawdownDistribution: patch.distribution ?? "Quantile",
    renderDrawdownWalks: false,
    renderModelMax: true,
    renderModelMin: true,
    renderPriceDistribution: patch.distribution ?? "Quantile",
    renderPriceWalks: false,
    samplesToRender: 1,
    showHistoric: true,
  },
  samples: patch.samples ?? 1,
  scenario: {
    clampBottom: false,
    clampTop: false,
    model: "Power Law",
    oneOffFiatVariables: [],
    oneOffItems: [],
    reoccurringItems:
      patch.items === false
        ? []
        : [
            {
              active: true,
              annualAmount: 100_000,
              annualPercentChange: 0,
              effective: new Date(Date.now() + 8 * MS_PER_YEAR),
              expense: true,
              id: "item-1",
              isFiat: true,
              name: "Live off Bitcoin",
            },
          ],
    settings: { yearOffset: 6 },
    showModel: patch.showModel ?? false,
    volatility: 0.1,
    walk: "Bubble",
  },
  seed: 1,
  stack: { bitcoin: 1 },
  years: patch.years ?? 1,
});
