import memoize from "memoizee";

import { numberAt } from "../../../number-at";
import { checkLoss, golden, sinceGenesis } from "./regression";

const floorLevel = 0.01;
const hingeLevel = 0.5;
const ceilingLevel = 0.99;
const lambdaLow = 100;
const lambdaHigh = 100_000;
const betaLow = 0.05;
// Stretched exponential (Kohlrausch): the exponent stays at most 1. Above 1 the curve is a compressed cutoff.
const betaHigh = 1;
const lambdaGrid = 8;
const betaGrid = 5;
const polishPasses = 2;
const polishSteps = 8;
const exponentialParameters = 2;
const stretchedParameters = 3;

interface Decay {
  amplitude: number;
  beta: number;
  lambdaDays: number;
  loss: number;
}

const count = sinceGenesis.count;
const weights = new Float64Array(count);
const ratios = new Float64Array(count);
const active: number[] = [];

// Asymmetric Laplace AIC. Terms that depend only on the level cancel in the comparison.
const quantileAic = (loss: number, parameters: number): number =>
  2 * count * Math.log(loss / count) +
  2 * parameters -
  2 * count * Math.log(ceilingLevel * (1 - ceilingLevel)) +
  2 * count;

const logGrid = (low: number, high: number, steps: number, index: number): number =>
  low * (high / low) ** (index / (steps - 1));

const lines = memoize(() => {
  const floor = sinceGenesis.fitPower(floorLevel);
  const hinge = sinceGenesis.fitPower(hingeLevel);
  const residual = new Float64Array(count);
  for (let index = 0; index < count; index++) {
    residual[index] =
      numberAt(sinceGenesis.logPrice, index) -
      hinge.intercept -
      hinge.exponent * numberAt(sinceGenesis.logDays, index);
  }

  const profile = (lambdaDays: number, beta: number): { amplitude: number; loss: number } => {
    active.length = 0;
    let weightSum = 0;
    for (let index = 0; index < count; index++) {
      const weight = Math.exp(-((numberAt(sinceGenesis.days, index) / lambdaDays) ** beta));
      weights[index] = weight;
      if (weight === 0) continue;
      ratios[index] = numberAt(residual, index) / weight;
      active.push(index);
      weightSum += weight;
    }
    active.sort((left, right) => numberAt(ratios, left) - numberAt(ratios, right));
    const target = ceilingLevel * weightSum;
    let covered = 0;
    let amplitude = 0;
    for (const point of active) {
      covered += numberAt(weights, point);
      if (covered >= target) {
        amplitude = numberAt(ratios, point);
        break;
      }
    }
    let loss = 0;
    for (let index = 0; index < count; index++) {
      const gap = numberAt(residual, index) - amplitude * numberAt(weights, index);
      loss += checkLoss(gap, ceilingLevel);
    }
    return { amplitude, loss };
  };

  const fitDecay = (lockedBeta: number | undefined): Decay => {
    let bestBeta = lockedBeta ?? betaLow;
    let bestLambda = lambdaLow;
    let bestLoss = Number.POSITIVE_INFINITY;
    const betaSteps = lockedBeta === undefined ? betaGrid : 1;
    for (let lambdaIndex = 0; lambdaIndex < lambdaGrid; lambdaIndex++) {
      const lambdaDays = logGrid(lambdaLow, lambdaHigh, lambdaGrid, lambdaIndex);
      for (let betaIndex = 0; betaIndex < betaSteps; betaIndex++) {
        const beta = lockedBeta ?? logGrid(betaLow, betaHigh, betaGrid, betaIndex);
        const { loss } = profile(lambdaDays, beta);
        if (loss < bestLoss) {
          bestBeta = beta;
          bestLambda = lambdaDays;
          bestLoss = loss;
        }
      }
    }

    let lambdaDays = bestLambda;
    let beta = bestBeta;
    for (let pass = 0; pass < polishPasses; pass++) {
      lambdaDays = golden(
        (value) => profile(value, beta).loss,
        Math.max(lambdaLow, lambdaDays / 4),
        Math.min(lambdaHigh, lambdaDays * 4),
        polishSteps,
      );
      if (lockedBeta !== undefined) continue;
      beta = golden(
        (value) => profile(lambdaDays, value).loss,
        Math.max(betaLow, beta / 2),
        Math.min(betaHigh, beta * 2),
        polishSteps,
      );
    }
    const fitted = profile(lambdaDays, beta);
    return { amplitude: fitted.amplitude, beta, lambdaDays, loss: fitted.loss };
  };

  const exponential = fitDecay(1);
  const stretched = fitDecay(undefined);
  const decay =
    quantileAic(exponential.loss, exponentialParameters) <=
    quantileAic(stretched.loss, stretchedParameters)
      ? exponential
      : stretched;
  return { decay, floor, hinge };
});

export const planCPrice = (unixTimeMs: number, ceiling: boolean): number => {
  const fitted = lines();
  if (!ceiling) return sinceGenesis.price(unixTimeMs, fitted.floor);
  const dayCount = sinceGenesis.dayCount(unixTimeMs);
  const gap =
    fitted.decay.amplitude * Math.exp(-((dayCount / fitted.decay.lambdaDays) ** fitted.decay.beta));
  return Math.exp(fitted.hinge.intercept + fitted.hinge.exponent * Math.log(dayCount) + gap);
};
