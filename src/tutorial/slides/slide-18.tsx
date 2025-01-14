/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { type FC } from "react";

import { SlideContent } from "../../components/slides";
import { MS_PER_YEAR } from "../../constants";
import { type SlideRequirement } from "../../types";

const Slide18: FC = () => (
  <SlideContent>
    <p>
      You wasted your 20s on fiat BS and have a net worth of 0, but at 30 years
      old, you finally took the Orange Pill: 🤯
    </p>
    <p>
      You have committed to stacking a modest $5,000 of bitcoin every year for
      the next 30 years, and then living off that in retirement at $185,000 a
      year (in today's dollars). You suspect inflation will always be more than
      they say, so you figure 3% (50% above the Feds target goal of 2%) is a
      conservative expectation.
    </p>
    <p>
      According to the chart, you have around a 50% chance of still having
      bitcoin when you turn 100. Not bad! However, just to double-check
      yourself, you wonder how much you might have if inflation is just 1%
      higher.
    </p>
    <p>Increase inflation by 1%.</p>
    <p>
      As you can see, a 1% increase in inflation over the course of your
      lifetime translates to losing 30 YEARS. No problem, you say to yourself
      over the pit in your stomach, you'll adjust your retirement expectations:
      Change your retirement lifestyle to $130,000. And you're right back up
      there! But then you discover{" "}
      <a
        aria-label="Shadow Stats - Opens in new tab"
        href="https://www.shadowstats.com/alternate_data/inflation-charts/"
        rel="noopener noreferrer"
        tabIndex={0}
        target="_blank"
      >
        Shadow Stats
      </a>{" "}
      and a real inflation rate inline with money supply of between 8% and 12%.
      Increase inflation to 8%...
    </p>
  </SlideContent>
);

export const slide18 = {
  component: Slide18,
  requirements: {
    bitcoin: 0,
    clampBottom: true,
    clampTop: true,
    epochCount: 18,
    inflation: 3,
    model: "Power Law Regression Median",
    oneOffFiatVariables: [],
    oneOffItems: [],
    renderDrawdownDistribution: "Quantile",
    renderDrawdownWalks: false,
    renderPriceDistribution: "Quantile",
    renderPriceWalks: false,
    reoccurringItems: [
      {
        active: true,
        annualAmount: 5000,
        annualPercentChange: 0,
        effective: new Date(),
        end: new Date(Date.now() + MS_PER_YEAR * 30),
        expense: false,
        id: "item_retirement_1",
        isFiat: true,
        name: "Retirement Saving",
      },
      {
        active: true,
        annualAmount: 185_000,
        annualPercentChange: 0,
        effective: new Date(Date.now() + MS_PER_YEAR * 30),
        expense: true,
        id: "item_retirement_2",
        isFiat: true,
        name: "Retirement Drawdown",
      },
    ],
  } satisfies SlideRequirement,
};
