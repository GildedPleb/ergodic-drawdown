interface WalkOptions {
  clampBottom: boolean;
  clampTop: boolean;
  start: number;
  startDay: number;
  volatility: number;
}

const LENGTH = 208;

export type IWalk = (Options: WalkOptions) => number[];

let currentPingPongPhase: "ascent" | "descent" = "descent";

export const pingPong: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;

  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    switch (currentPingPongPhase) {
      case "ascent": {
        currentValue += randomComponent + Math.random() * 0.005;
        if (currentValue >= 1) currentPingPongPhase = "descent";
        break;
      }
      case "descent": {
        currentValue -= randomComponent + Math.random() * 0.005;
        if (currentValue <= 0) currentPingPongPhase = "ascent";
        break;
      }
    }
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data.push(currentValue);
  }
  return data;
};

export const bubble: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;
  let currentPhase = "ascent";
  let velocity = 0;
  const acceleration = 0.0005;

  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    switch (currentPhase) {
      case "base": {
        currentValue += randomComponent;
        break;
      }
      case "ascent": {
        currentValue += velocity + randomComponent;
        velocity += acceleration;
        if (currentValue >= 1) currentPhase = "descent";
        break;
      }
      case "descent": {
        currentValue -= Math.abs(velocity) + randomComponent;
        velocity -= acceleration;
        if (currentValue <= 0) {
          currentPhase = "base";
          velocity = 0;
        }
        break;
      }
    }
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;
    data.push(currentValue);
  }
  return data;
};

export const random: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;

  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;
    currentValue += randomComponent;
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;
    data.push(currentValue);
  }
  return data;
};

export const sinusoidal: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0.5,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;
  let delta = 0.01;

  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;
    delta = 0.01 * Math.sin((2 * Math.PI * day) / LENGTH) + randomComponent;
    currentValue += delta;
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;
    data.push(currentValue);
  }
  return data;
};

export const shark: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0.5,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;
  let expoState = 1.05;
  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    currentValue *= expoState;
    currentValue += randomComponent;

    if (currentValue >= 1) {
      currentValue = 2 - currentValue;
      expoState = 0.95;
    } else if (currentValue <= 0.001) {
      currentValue = -currentValue;
      expoState = 1.05;
    }

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data.push(currentValue);
  }
  return data;
};

export const momentumDrift: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0.5,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;
  let momentum = 0;
  const momentumDecay = 0.9;
  const maxMomentum = 0.03;

  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    // Update the momentum with decay and ensure it does not exceed maxMomentum
    momentum = momentum * momentumDecay + randomComponent;
    momentum = Math.max(-maxMomentum, Math.min(maxMomentum, momentum));

    // Apply the current momentum to the current value
    currentValue += momentum;

    // Reflect at boundaries to ensure ergodicity and prevent sticking at edges
    if (currentValue > 1) {
      currentValue = 2 - currentValue;
      momentum = -momentum;
    } else if (currentValue < 0) {
      currentValue = -currentValue;
      momentum = -momentum;
    }

    // Clamp values if specified
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data.push(currentValue);
  }
  return data;
};

export const sawtooth: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;
  let increment = 0.01;

  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;
    increment = 0.01 + randomComponent;

    currentValue += increment;

    // Reset at the top and reflect at the bottom to ensure full range coverage
    if (currentValue >= 1) {
      currentValue = 0;
    } else if (currentValue < 0) {
      currentValue = -currentValue;
    }

    // Optionally clamp values if specified
    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data.push(currentValue);
  }
  return data;
};

export const USElections: IWalk = ({
  clampBottom = false,
  clampTop = false,
  start = 0,
  startDay = 0,
  volatility = 0.07,
}): number[] => {
  const data = [start];
  let currentValue = start;
  const decrement = 0.003;

  for (let day = startDay; day < LENGTH; day++) {
    const randomComponent = (Math.random() - 0.5) * volatility;

    currentValue -= randomComponent + decrement;

    if (clampTop && currentValue > 1) currentValue = 1;
    if (clampBottom && currentValue < 0) currentValue = 0;

    data.push(currentValue);
    if (currentValue <= 0) {
      currentValue = 1;
    }
  }
  return data;
};

export const walks: Record<string, IWalk> = {
  Bubble: bubble,
  Momentum: momentumDrift,
  Pong: pingPong,
  Random: random,
  Saw: sawtooth,
  Shark: shark,
  Sin: sinusoidal,
  "Vote Counting": USElections,
} as const;