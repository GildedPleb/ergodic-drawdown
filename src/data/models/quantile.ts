import { MS_PER_WEEK } from "../../constants";
import { defineModel } from "./define";
import { planCPrice } from "./quantile/plan-c";
import { santostasiPrice } from "./quantile/santostasi";
import { sminstonPrice } from "./quantile/sminston";

const quantilePrice = (unixTimeMs: number, source: string, ceiling: boolean): number => {
  if (source === "plan-c") return planCPrice(unixTimeMs, ceiling);
  if (source === "santostasi") return santostasiPrice(unixTimeMs, ceiling);
  return sminstonPrice(unixTimeMs, ceiling);
};

const quantileModel = defineModel({
  description:
    "Sminston With fits each power-law quantile on its own, price = k × days ^ exponent, with days since 2009-01-03 (https://www.sminstonwith.com/chart/power-law-quantiles). His chart defaults to that own-fit on daily closes, and he updates the coefficients as new days arrive. The non-crossing control on that chart is his other mode. This choice refits the 1% and 99% lines on the weekly closes, so the exponents differ and the lines eventually cross. Santostasi's Bitcoin Lab article of 2 June 2024 (https://researchbitcoin.net/bitcoin-power-law-price-prediction-using-quantile-regression/) is a power-law quantile regression, log10(price) = a + b × log10(t), fit at each quantile, where t counts 2009-01-03 as day 1. As of 2024-06-01 the 50% line was log10(price) = -17.073835 + 5.826729 × log10(t). The 1 January 2026 forecast on that fit was 65,895 at the 5% edge, 106,333 on the 50% line, and 284,536 at the 95% edge. The lab refits daily. This choice refits the 5% and 95% lines separately on the weekly closes, so each edge has its own exponent and the 95% line grows more slowly. Plan C's Quantile Model v2 of 15 October 2025 (https://x.com/TheRealPlanC/status/1978449114179236198) fits 999 levels from 0.001 to 0.999 on more than 133,000 points. The 1% line is linear quantile regression. Quantiles 50 to 100 add a decay, and a quantile AIC picks a stretched exponential, exp(−(t / λ) ^ β) with β at most 1, or an exponential, exp(−t / λ). That chart's 1% row reads 50K today, 71K in one year, and 237K in five years, and its 99.9% row reads 248K, 316K, and 769K. He has not published the coefficients. This choice refits a weekly approximation on the Saturday closes. The floor is its own 1% power-law quantile. The ceiling is the 50% power-law quantile plus a positive gap at the 99% edge, and the asymmetric Laplace AIC on those closes picks the gap. Source is Sminston, Santostasi, or Plan C.",
  maxPrice: ({ now, settings, week }): number => {
    return quantilePrice(now + week * MS_PER_WEEK, settings.source, true);
  },
  minPrice: ({ now, settings, week }): number => {
    return quantilePrice(now + week * MS_PER_WEEK, settings.source, false);
  },
  name: "Quantile" as const,
  params: [
    {
      default: "sminston",
      key: "source",
      kind: "choice",
      label: "Source",
      options: [
        { label: "Sminston", value: "sminston" },
        { label: "Santostasi", value: "santostasi" },
        { label: "Plan C", value: "plan-c" },
      ],
    },
  ],
  summary:
    "Source defaults to Sminston, the 1% and 99% lines each fit on the weekly closes. Santostasi fits the 5% and 95% power laws on their own. Plan C fits the 1% line on its own and puts a decaying gap on the 99% edge above the 50% line.",
});

export default quantileModel;
