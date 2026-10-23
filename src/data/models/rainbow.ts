import memoize from "memoizee";

import { MS_PER_DAY, MS_PER_WEEK } from "../../constants";
import { defineModel } from "./define";

const unix2012Jan1 = Date.UTC(2012, 0, 1);
const intercept2014 = 19.493;
const intercept2022 = 19.463;

const band = memoize(
  (unixTimeMs: number, slope: number, daysAdded: number, intercept: number): number => {
    const days = (unixTimeMs - unix2012Jan1) / MS_PER_DAY + daysAdded;
    return 10 ** (slope * Math.log(days) - intercept);
  },
);

const rainbowPrice = (unixTimeMs: number, refit: string, ceiling: boolean): number => {
  const intercept = refit === "2014" ? intercept2014 : intercept2022;
  if (ceiling) return band(unixTimeMs, 2.9, 1400, intercept);
  if (refit === "2022-violet") return band(unixTimeMs, 2.775, 1175, intercept2022);
  // Fire sale. An unlisted refit uses the 2022 intercept on this floor too.
  return band(unixTimeMs, 2.788, 1200, intercept);
};

const rainbowModel = defineModel({
  description:
    "Each line is 10^(slope * ln(days since 2012-01-01 + days added) - intercept). The ceiling is the bubble line, slope 2.9 with 1400 days added. The floor is the fire-sale line, slope 2.788 with 1200 days added. 2022 subtracts 19.463. 2014 subtracts 19.493, the constant from that year's regression, on the same two lines. 2022 violet keeps the 2022 ceiling and lowers the floor to slope 2.775 with 1175 days added.",
  maxPrice: ({ now, settings, week }): number => {
    return rainbowPrice(now + week * MS_PER_WEEK, settings.refit, true);
  },
  minPrice: ({ now, settings, week }): number => {
    return rainbowPrice(now + week * MS_PER_WEEK, settings.refit, false);
  },
  name: "Rainbow" as const,
  params: [
    {
      default: "2022",
      key: "refit",
      kind: "choice",
      label: "Refit",
      options: [
        { label: "2014", value: "2014" },
        { label: "2022", value: "2022" },
        { label: "2022 violet", value: "2022-violet" },
      ],
    },
  ],
  summary:
    "Refit defaults to 2022, whose floor is the fire-sale line and whose ceiling is the bubble line. 2022 violet lowers only the floor. 2014 uses those same two lines with the 2014 intercept, so the band sits lower.",
});

export default rainbowModel;
