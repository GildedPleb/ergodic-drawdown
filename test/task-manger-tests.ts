// Import the function (assuming it's in a file named taskQueue.js)
import { createTaskQueue } from "../src/helpers";
import { type Task } from "../src/types";

interface RuntimeAnalysis {
  roundBreakdown: Array<{ round: number; runtime: number }>;
  totalRounds: number;
  totalRuntime: number;
}

const calculateExpectedRuntime = (
  tasks: Task[],
  workerCount: number,
): RuntimeAnalysis => {
  const rounds: number[][] = [];
  let currentRound: number[] = [];

  for (const task of tasks) {
    const taskSize = task.endIndex - task.startIndex;
    if (currentRound.length < workerCount) {
      currentRound.push(taskSize);
    } else {
      rounds.push(currentRound);
      currentRound = [taskSize];
    }
  }

  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  const roundBreakdown = rounds.map((round, index) => {
    const maxTaskSize = Math.max(...round);
    // 50ms per 100 samples + 10ms load time
    const runtime = (maxTaskSize * 50) / 100 + 10;
    return { round: index + 1, runtime };
  });

  const totalRuntime = roundBreakdown.reduce(
    (sum, { runtime }) => sum + runtime,
    0,
  );

  return {
    roundBreakdown,
    totalRounds: rounds.length,
    totalRuntime,
  };
};

const runTest = (
  totalSamples: number,
  workerCount: number,
  expectedResults: Task[],
  startingSample = 0,
  samplesPerArray = 1024,
): void => {
  const result = createTaskQueue(
    totalSamples,
    workerCount,
    samplesPerArray,
    startingSample,
  );
  let pass = true;
  let failureReason = "";

  const testName = `Samples: ${totalSamples}, Worker Count: ${workerCount}, Starting Sample: ${startingSample}, Samples Per Array: ${samplesPerArray}`;

  if (result.length === expectedResults.length) {
    for (const [index, actual] of result.entries()) {
      const expected = expectedResults[index];
      if (
        actual.arrayIndex !== expected.arrayIndex ||
        actual.startIndex !== expected.startIndex ||
        actual.endIndex !== expected.endIndex
      ) {
        pass = false;
        failureReason = `Mismatch in task ${index}:\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`;
        break;
      }
    }
  } else {
    pass = false;
    failureReason = `Expected ${expectedResults.length} tasks, got ${result.length}`;
  }

  const runtimeAnalysis = calculateExpectedRuntime(result, workerCount);
  const expectedRuntimeAnalysis = calculateExpectedRuntime(
    expectedResults,
    workerCount,
  );

  console.log(`--> ${pass ? "PASS" : "FAIL"}: Test ${testName}`);

  if (!pass) {
    console.log(
      "Test:",
      totalSamples,
      workerCount,
      samplesPerArray,
      startingSample,
    );
    console.log(`Failure reason: ${failureReason}`);
    console.log("Actual result:", result);
    console.log("Expected result:", expectedResults);
    console.log(`\nRuntime Analysis:`);
    console.log(`Total Rounds: ${runtimeAnalysis.totalRounds}`);

    console.log(
      `Total Expected Runtime: ${runtimeAnalysis.totalRuntime.toFixed(2)}ms`,
    );
    console.log(`Round Breakdown:`);
    for (const { round, runtime } of runtimeAnalysis.roundBreakdown) {
      console.log(`  Round ${round}: ${runtime.toFixed(2)}ms`);
    }

    console.log(`\nExpected Runtime Analysis:`);
    console.log(`Total Rounds: ${expectedRuntimeAnalysis.totalRounds}`);
    console.log(
      `Total Expected Runtime: ${expectedRuntimeAnalysis.totalRuntime.toFixed(2)}ms`,
    );
    console.log(`Round Breakdown:`);
    for (const { round, runtime } of expectedRuntimeAnalysis.roundBreakdown) {
      console.log(`  Round ${round}: ${runtime.toFixed(2)}ms`);
    }
    throw new Error("REKT");
  }
};

// All tests assume 1000 samplesPerArray
// Test 1: Basic functionality
runTest(1000, 4, [
  { arrayIndex: 0, endIndex: 250, startIndex: 0 },
  { arrayIndex: 0, endIndex: 500, startIndex: 250 },
  { arrayIndex: 0, endIndex: 750, startIndex: 500 },
  { arrayIndex: 0, endIndex: 1000, startIndex: 750 },
]);

// Test 2: Single worker
runTest(500, 1, [{ arrayIndex: 0, endIndex: 500, startIndex: 0 }]);

// Test 3: More workers than samples
runTest(10, 20, [
  { arrayIndex: 0, endIndex: 1, startIndex: 0 },
  { arrayIndex: 0, endIndex: 2, startIndex: 1 },
  { arrayIndex: 0, endIndex: 3, startIndex: 2 },
  { arrayIndex: 0, endIndex: 4, startIndex: 3 },
  { arrayIndex: 0, endIndex: 5, startIndex: 4 },
  { arrayIndex: 0, endIndex: 6, startIndex: 5 },
  { arrayIndex: 0, endIndex: 7, startIndex: 6 },
  { arrayIndex: 0, endIndex: 8, startIndex: 7 },
  { arrayIndex: 0, endIndex: 9, startIndex: 8 },
  { arrayIndex: 0, endIndex: 10, startIndex: 9 },
]);

// Test 4: Large number of samples
runTest(9000, 8, [
  { arrayIndex: 0, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 2, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 3, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 4, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 5, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 6, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 7, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 8, endIndex: 101, startIndex: 0 },
  { arrayIndex: 8, endIndex: 202, startIndex: 101 },
  { arrayIndex: 8, endIndex: 303, startIndex: 202 },
  { arrayIndex: 8, endIndex: 404, startIndex: 303 },
  { arrayIndex: 8, endIndex: 505, startIndex: 404 },
  { arrayIndex: 8, endIndex: 606, startIndex: 505 },
  { arrayIndex: 8, endIndex: 707, startIndex: 606 },
  { arrayIndex: 8, endIndex: 808, startIndex: 707 },
]);

runTest(2500, 4, [
  { arrayIndex: 0, endIndex: 512, startIndex: 0 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 512 },
  { arrayIndex: 1, endIndex: 512, startIndex: 0 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 512 },
  { arrayIndex: 2, endIndex: 113, startIndex: 0 },
  { arrayIndex: 2, endIndex: 226, startIndex: 113 },
  { arrayIndex: 2, endIndex: 339, startIndex: 226 },
  { arrayIndex: 2, endIndex: 452, startIndex: 339 },
]);

// Test 5: Uneven distribution
runTest(1500, 4, [
  { arrayIndex: 0, endIndex: 256, startIndex: 0 },
  { arrayIndex: 0, endIndex: 512, startIndex: 256 },
  { arrayIndex: 0, endIndex: 768, startIndex: 512 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 768 },
  { arrayIndex: 1, endIndex: 119, startIndex: 0 },
  { arrayIndex: 1, endIndex: 238, startIndex: 119 },
  { arrayIndex: 1, endIndex: 357, startIndex: 238 },
  { arrayIndex: 1, endIndex: 476, startIndex: 357 },
]);

// Test 6: Edge case - 0 samples
runTest(0, 5, []);

// Test 7: Edge case - 0 workers
runTest(1000, 0, []);

// Test 8: Multiple arrays with uneven distribution
runTest(3072, 3, [
  { arrayIndex: 0, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 2, endIndex: 1024, startIndex: 0 },
]);

runTest(3000, 3, [
  { arrayIndex: 0, endIndex: 342, startIndex: 0 },
  { arrayIndex: 0, endIndex: 684, startIndex: 342 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 684 },
  { arrayIndex: 1, endIndex: 342, startIndex: 0 },
  { arrayIndex: 1, endIndex: 684, startIndex: 342 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 684 },
  { arrayIndex: 2, endIndex: 318, startIndex: 0 },
  { arrayIndex: 2, endIndex: 636, startIndex: 318 },
  { arrayIndex: 2, endIndex: 952, startIndex: 636 },
]);

runTest(
  3000,
  3,
  [
    { arrayIndex: 0, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 0 },
  ],
  0,
  1000,
);

// Test 9: Just out of bounds:
runTest(1001, 8, [
  { arrayIndex: 0, endIndex: 126, startIndex: 0 },
  { arrayIndex: 0, endIndex: 252, startIndex: 126 },
  { arrayIndex: 0, endIndex: 378, startIndex: 252 },
  { arrayIndex: 0, endIndex: 504, startIndex: 378 },
  { arrayIndex: 0, endIndex: 630, startIndex: 504 },
  { arrayIndex: 0, endIndex: 756, startIndex: 630 },
  { arrayIndex: 0, endIndex: 882, startIndex: 756 },
  { arrayIndex: 0, endIndex: 1001, startIndex: 882 },
]);

runTest(1025, 8, [
  { arrayIndex: 0, endIndex: 128, startIndex: 0 },
  { arrayIndex: 0, endIndex: 256, startIndex: 128 },
  { arrayIndex: 0, endIndex: 384, startIndex: 256 },
  { arrayIndex: 0, endIndex: 512, startIndex: 384 },
  { arrayIndex: 0, endIndex: 640, startIndex: 512 },
  { arrayIndex: 0, endIndex: 768, startIndex: 640 },
  { arrayIndex: 0, endIndex: 896, startIndex: 768 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 896 },
  { arrayIndex: 1, endIndex: 1, startIndex: 0 },
]);

runTest(9216, 3, [
  { arrayIndex: 0, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 2, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 3, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 4, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 5, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 6, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 7, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 8, endIndex: 1024, startIndex: 0 },
]);

runTest(1216, 3, [
  { arrayIndex: 0, endIndex: 342, startIndex: 0 },
  { arrayIndex: 0, endIndex: 684, startIndex: 342 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 684 },
  { arrayIndex: 1, endIndex: 64, startIndex: 0 },
  { arrayIndex: 1, endIndex: 128, startIndex: 64 },
  { arrayIndex: 1, endIndex: 192, startIndex: 128 },
]);

runTest(
  1216,
  3,
  [
    { arrayIndex: 0, endIndex: 334, startIndex: 0 },
    { arrayIndex: 0, endIndex: 668, startIndex: 334 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 1, endIndex: 72, startIndex: 0 },
    { arrayIndex: 1, endIndex: 144, startIndex: 72 },
    { arrayIndex: 1, endIndex: 216, startIndex: 144 },
  ],
  0,
  1000,
);

runTest(
  5000,
  3,
  [
    { arrayIndex: 0, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 3, endIndex: 334, startIndex: 0 },
    { arrayIndex: 3, endIndex: 668, startIndex: 334 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 4, endIndex: 334, startIndex: 0 },
    { arrayIndex: 4, endIndex: 668, startIndex: 334 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 668 },
  ],
  0,
  1000,
);

runTest(
  4500,
  3,
  // Should actually be:
  // [
  //   { arrayIndex: 0, endIndex: 1000, startIndex: 0 },
  //   { arrayIndex: 1, endIndex: 1000, startIndex: 0 },
  //   { arrayIndex: 2, endIndex: 1000, startIndex: 0 },
  //   { arrayIndex: 3, endIndex: 500, startIndex: 0 },
  //   { arrayIndex: 3, endIndex: 1000, startIndex: 500 },
  //   { arrayIndex: 4, endIndex: 500, startIndex: 0 },
  // ],
  [
    { arrayIndex: 0, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 3, endIndex: 334, startIndex: 0 },
    { arrayIndex: 3, endIndex: 668, startIndex: 334 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 4, endIndex: 167, startIndex: 0 },
    { arrayIndex: 4, endIndex: 334, startIndex: 167 },
    { arrayIndex: 4, endIndex: 500, startIndex: 334 },
  ],
  0,
  1000,
);

runTest(
  2000,
  3,
  [
    { arrayIndex: 0, endIndex: 334, startIndex: 0 },
    { arrayIndex: 0, endIndex: 668, startIndex: 334 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 1, endIndex: 334, startIndex: 0 },
    { arrayIndex: 1, endIndex: 668, startIndex: 334 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 668 },
  ],
  0,
  1000,
);

runTest(
  4000,
  8,
  [
    { arrayIndex: 0, endIndex: 500, startIndex: 0 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 1, endIndex: 500, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 2, endIndex: 500, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 3, endIndex: 500, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 500 },
  ],
  0,
  1000,
);

runTest(4000, 8, [
  { arrayIndex: 0, endIndex: 256, startIndex: 0 },
  { arrayIndex: 0, endIndex: 512, startIndex: 256 },
  { arrayIndex: 0, endIndex: 768, startIndex: 512 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 768 },
  { arrayIndex: 1, endIndex: 256, startIndex: 0 },
  { arrayIndex: 1, endIndex: 512, startIndex: 256 },
  { arrayIndex: 1, endIndex: 768, startIndex: 512 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 768 },
  { arrayIndex: 2, endIndex: 128, startIndex: 0 },
  { arrayIndex: 2, endIndex: 256, startIndex: 128 },
  { arrayIndex: 2, endIndex: 384, startIndex: 256 },
  { arrayIndex: 2, endIndex: 512, startIndex: 384 },
  { arrayIndex: 2, endIndex: 640, startIndex: 512 },
  { arrayIndex: 2, endIndex: 768, startIndex: 640 },
  { arrayIndex: 2, endIndex: 896, startIndex: 768 },
  { arrayIndex: 2, endIndex: 1024, startIndex: 896 },
  { arrayIndex: 3, endIndex: 116, startIndex: 0 },
  { arrayIndex: 3, endIndex: 232, startIndex: 116 },
  { arrayIndex: 3, endIndex: 348, startIndex: 232 },
  { arrayIndex: 3, endIndex: 464, startIndex: 348 },
  { arrayIndex: 3, endIndex: 580, startIndex: 464 },
  { arrayIndex: 3, endIndex: 696, startIndex: 580 },
  { arrayIndex: 3, endIndex: 812, startIndex: 696 },
  { arrayIndex: 3, endIndex: 928, startIndex: 812 },
]);

runTest(
  2345,
  6,
  [
    { arrayIndex: 0, endIndex: 334, startIndex: 0 },
    { arrayIndex: 0, endIndex: 668, startIndex: 334 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 1, endIndex: 334, startIndex: 0 },
    { arrayIndex: 1, endIndex: 668, startIndex: 334 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 2, endIndex: 58, startIndex: 0 },
    { arrayIndex: 2, endIndex: 116, startIndex: 58 },
    { arrayIndex: 2, endIndex: 174, startIndex: 116 },
    { arrayIndex: 2, endIndex: 232, startIndex: 174 },
    { arrayIndex: 2, endIndex: 290, startIndex: 232 },
    { arrayIndex: 2, endIndex: 345, startIndex: 290 },
  ],
  0,
  1000,
);

runTest(2345, 6, [
  { arrayIndex: 0, endIndex: 342, startIndex: 0 },
  { arrayIndex: 0, endIndex: 684, startIndex: 342 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 684 },
  { arrayIndex: 1, endIndex: 342, startIndex: 0 },
  { arrayIndex: 1, endIndex: 684, startIndex: 342 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 684 },
  { arrayIndex: 2, endIndex: 50, startIndex: 0 },
  { arrayIndex: 2, endIndex: 100, startIndex: 50 },
  { arrayIndex: 2, endIndex: 150, startIndex: 100 },
  { arrayIndex: 2, endIndex: 200, startIndex: 150 },
  { arrayIndex: 2, endIndex: 250, startIndex: 200 },
  { arrayIndex: 2, endIndex: 297, startIndex: 250 },
]);

runTest(
  6000,
  3,
  [
    { arrayIndex: 0, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 5, endIndex: 1000, startIndex: 0 },
  ],
  0,
  1000,
);

runTest(6000, 3, [
  { arrayIndex: 0, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 2, endIndex: 1024, startIndex: 0 },
  { arrayIndex: 3, endIndex: 342, startIndex: 0 },
  { arrayIndex: 3, endIndex: 684, startIndex: 342 },
  { arrayIndex: 3, endIndex: 1024, startIndex: 684 },
  { arrayIndex: 4, endIndex: 342, startIndex: 0 },
  { arrayIndex: 4, endIndex: 684, startIndex: 342 },
  { arrayIndex: 4, endIndex: 1024, startIndex: 684 },
  { arrayIndex: 5, endIndex: 294, startIndex: 0 },
  { arrayIndex: 5, endIndex: 588, startIndex: 294 },
  { arrayIndex: 5, endIndex: 880, startIndex: 588 },
]);

runTest(
  2001,
  8,
  [
    { arrayIndex: 0, endIndex: 250, startIndex: 0 },
    { arrayIndex: 0, endIndex: 500, startIndex: 250 },
    { arrayIndex: 0, endIndex: 750, startIndex: 500 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 1, endIndex: 250, startIndex: 0 },
    { arrayIndex: 1, endIndex: 500, startIndex: 250 },
    { arrayIndex: 1, endIndex: 750, startIndex: 500 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 2, endIndex: 1, startIndex: 0 },
  ],
  0,
  1000,
);

runTest(2049, 8, [
  { arrayIndex: 0, endIndex: 256, startIndex: 0 },
  { arrayIndex: 0, endIndex: 512, startIndex: 256 },
  { arrayIndex: 0, endIndex: 768, startIndex: 512 },
  { arrayIndex: 0, endIndex: 1024, startIndex: 768 },
  { arrayIndex: 1, endIndex: 256, startIndex: 0 },
  { arrayIndex: 1, endIndex: 512, startIndex: 256 },
  { arrayIndex: 1, endIndex: 768, startIndex: 512 },
  { arrayIndex: 1, endIndex: 1024, startIndex: 768 },
  { arrayIndex: 2, endIndex: 1, startIndex: 0 },
]);

runTest(
  2001,
  8,
  [
    { arrayIndex: 1, endIndex: 330, startIndex: 234 },
    { arrayIndex: 1, endIndex: 426, startIndex: 330 },
    { arrayIndex: 1, endIndex: 522, startIndex: 426 },
    { arrayIndex: 1, endIndex: 618, startIndex: 522 },
    { arrayIndex: 1, endIndex: 714, startIndex: 618 },
    { arrayIndex: 1, endIndex: 810, startIndex: 714 },
    { arrayIndex: 1, endIndex: 906, startIndex: 810 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 906 },
    { arrayIndex: 2, endIndex: 1, startIndex: 0 },
  ],
  1234,
  1000,
);

runTest(
  2001,
  8,
  [
    { arrayIndex: 1, endIndex: 306, startIndex: 210 },
    { arrayIndex: 1, endIndex: 402, startIndex: 306 },
    { arrayIndex: 1, endIndex: 498, startIndex: 402 },
    { arrayIndex: 1, endIndex: 594, startIndex: 498 },
    { arrayIndex: 1, endIndex: 690, startIndex: 594 },
    { arrayIndex: 1, endIndex: 786, startIndex: 690 },
    { arrayIndex: 1, endIndex: 882, startIndex: 786 },
    { arrayIndex: 1, endIndex: 977, startIndex: 882 },
  ],
  1234,
);

runTest(
  2001,
  8,
  [
    { arrayIndex: 1, endIndex: 1000, startIndex: 999 },
    { arrayIndex: 2, endIndex: 1, startIndex: 0 },
  ],
  1999,
  1000,
);
runTest(
  2049,
  8,
  [
    { arrayIndex: 1, endIndex: 1024, startIndex: 1023 },
    { arrayIndex: 2, endIndex: 1, startIndex: 0 },
  ],
  2047,
);

runTest(
  2000,
  8,
  [{ arrayIndex: 1, endIndex: 1000, startIndex: 999 }],
  1999,
  1000,
);
runTest(2048, 8, [{ arrayIndex: 1, endIndex: 1024, startIndex: 1023 }], 2047);

runTest(
  2048,
  8,
  [
    { arrayIndex: 1, endIndex: 1016, startIndex: 1014 },
    { arrayIndex: 1, endIndex: 1018, startIndex: 1016 },
    { arrayIndex: 1, endIndex: 1020, startIndex: 1018 },
    { arrayIndex: 1, endIndex: 1022, startIndex: 1020 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 1022 },
  ],
  2038,
);

runTest(
  2000,
  8,
  [
    { arrayIndex: 1, endIndex: 992, startIndex: 990 },
    { arrayIndex: 1, endIndex: 994, startIndex: 992 },
    { arrayIndex: 1, endIndex: 996, startIndex: 994 },
    { arrayIndex: 1, endIndex: 998, startIndex: 996 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 998 },
  ],
  1990,
  1000,
);

runTest(
  2000,
  8,
  [
    { arrayIndex: 1, endIndex: 994, startIndex: 993 },
    { arrayIndex: 1, endIndex: 995, startIndex: 994 },
    { arrayIndex: 1, endIndex: 996, startIndex: 995 },
    { arrayIndex: 1, endIndex: 997, startIndex: 996 },
    { arrayIndex: 1, endIndex: 998, startIndex: 997 },
    { arrayIndex: 1, endIndex: 999, startIndex: 998 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 999 },
  ],
  1993,
  1000,
);

runTest(
  2048,
  8,
  [
    { arrayIndex: 1, endIndex: 1017, startIndex: 1016 },
    { arrayIndex: 1, endIndex: 1018, startIndex: 1017 },
    { arrayIndex: 1, endIndex: 1019, startIndex: 1018 },
    { arrayIndex: 1, endIndex: 1020, startIndex: 1019 },
    { arrayIndex: 1, endIndex: 1021, startIndex: 1020 },
    { arrayIndex: 1, endIndex: 1022, startIndex: 1021 },
    { arrayIndex: 1, endIndex: 1023, startIndex: 1022 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 1023 },
  ],
  2040,
);
runTest(
  2048,
  8,
  [
    { arrayIndex: 1, endIndex: 1018, startIndex: 1017 },
    { arrayIndex: 1, endIndex: 1019, startIndex: 1018 },
    { arrayIndex: 1, endIndex: 1020, startIndex: 1019 },
    { arrayIndex: 1, endIndex: 1021, startIndex: 1020 },
    { arrayIndex: 1, endIndex: 1022, startIndex: 1021 },
    { arrayIndex: 1, endIndex: 1023, startIndex: 1022 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 1023 },
  ],
  2041,
);

runTest(
  2000,
  8,
  [
    { arrayIndex: 1, endIndex: 995, startIndex: 994 },
    { arrayIndex: 1, endIndex: 996, startIndex: 995 },
    { arrayIndex: 1, endIndex: 997, startIndex: 996 },
    { arrayIndex: 1, endIndex: 998, startIndex: 997 },
    { arrayIndex: 1, endIndex: 999, startIndex: 998 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 999 },
  ],
  1994,
  1000,
);
runTest(
  2000,
  8,
  [
    { arrayIndex: 1, endIndex: 971, startIndex: 970 },
    { arrayIndex: 1, endIndex: 972, startIndex: 971 },
    { arrayIndex: 1, endIndex: 973, startIndex: 972 },
    { arrayIndex: 1, endIndex: 974, startIndex: 973 },
    { arrayIndex: 1, endIndex: 975, startIndex: 974 },
    { arrayIndex: 1, endIndex: 976, startIndex: 975 },
  ],
  1994,
);

runTest(
  2000,
  8,
  [
    { arrayIndex: 1, endIndex: 987, startIndex: 985 },
    { arrayIndex: 1, endIndex: 989, startIndex: 987 },
    { arrayIndex: 1, endIndex: 991, startIndex: 989 },
    { arrayIndex: 1, endIndex: 993, startIndex: 991 },
    { arrayIndex: 1, endIndex: 995, startIndex: 993 },
    { arrayIndex: 1, endIndex: 997, startIndex: 995 },
    { arrayIndex: 1, endIndex: 999, startIndex: 997 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 999 },
  ],
  1985,
  1000,
);

// Test case 1: More workers than samples
runTest(
  3,
  5,
  [
    { arrayIndex: 0, endIndex: 1, startIndex: 0 },
    { arrayIndex: 0, endIndex: 2, startIndex: 1 },
    { arrayIndex: 0, endIndex: 3, startIndex: 2 },
  ],
  0,
);

// Test case 2: Exactly one sample per worker
runTest(
  4,
  4,
  [
    { arrayIndex: 0, endIndex: 1, startIndex: 0 },
    { arrayIndex: 0, endIndex: 2, startIndex: 1 },
    { arrayIndex: 0, endIndex: 3, startIndex: 2 },
    { arrayIndex: 0, endIndex: 4, startIndex: 3 },
  ],
  0,
);

// Test case 3: One sample less than worker count
runTest(
  3,
  4,
  [
    { arrayIndex: 0, endIndex: 1, startIndex: 0 },
    { arrayIndex: 0, endIndex: 2, startIndex: 1 },
    { arrayIndex: 0, endIndex: 3, startIndex: 2 },
  ],
  0,
);

// Test case 4: Starting from the last sample of an array
runTest(
  1001,
  4,
  [
    { arrayIndex: 0, endIndex: 1000, startIndex: 999 },
    { arrayIndex: 1, endIndex: 1, startIndex: 0 },
  ],
  999,
  1000,
);

// Test case 5: Very large number of samples
runTest(
  10_000,
  8,
  [
    { arrayIndex: 0, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 5, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 6, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 7, endIndex: 1000, startIndex: 0 },
    { arrayIndex: 8, endIndex: 250, startIndex: 0 },
    { arrayIndex: 8, endIndex: 500, startIndex: 250 },
    { arrayIndex: 8, endIndex: 750, startIndex: 500 },
    { arrayIndex: 8, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 9, endIndex: 250, startIndex: 0 },
    { arrayIndex: 9, endIndex: 500, startIndex: 250 },
    { arrayIndex: 9, endIndex: 750, startIndex: 500 },
    { arrayIndex: 9, endIndex: 1000, startIndex: 750 },
  ],
  0,
  1000,
);

runTest(
  9216,
  8,
  [
    { arrayIndex: 0, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 4, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 5, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 6, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 7, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 8, endIndex: 128, startIndex: 0 },
    { arrayIndex: 8, endIndex: 256, startIndex: 128 },
    { arrayIndex: 8, endIndex: 384, startIndex: 256 },
    { arrayIndex: 8, endIndex: 512, startIndex: 384 },
    { arrayIndex: 8, endIndex: 640, startIndex: 512 },
    { arrayIndex: 8, endIndex: 768, startIndex: 640 },
    { arrayIndex: 8, endIndex: 896, startIndex: 768 },
    { arrayIndex: 8, endIndex: 1024, startIndex: 896 },
  ],
  0,
);
runTest(
  9216,
  7,
  [
    { arrayIndex: 0, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 4, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 5, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 6, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 7, endIndex: 147, startIndex: 0 },
    { arrayIndex: 7, endIndex: 294, startIndex: 147 },
    { arrayIndex: 7, endIndex: 441, startIndex: 294 },
    { arrayIndex: 7, endIndex: 588, startIndex: 441 },
    { arrayIndex: 7, endIndex: 735, startIndex: 588 },
    { arrayIndex: 7, endIndex: 882, startIndex: 735 },
    { arrayIndex: 7, endIndex: 1024, startIndex: 882 },
    { arrayIndex: 8, endIndex: 147, startIndex: 0 },
    { arrayIndex: 8, endIndex: 294, startIndex: 147 },
    { arrayIndex: 8, endIndex: 441, startIndex: 294 },
    { arrayIndex: 8, endIndex: 588, startIndex: 441 },
    { arrayIndex: 8, endIndex: 735, startIndex: 588 },
    { arrayIndex: 8, endIndex: 882, startIndex: 735 },
    { arrayIndex: 8, endIndex: 1024, startIndex: 882 },
  ],
  0,
);

// Test case 6: Single worker
runTest(
  5000,
  1,
  [
    { arrayIndex: 0, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1024, startIndex: 0 },
    { arrayIndex: 4, endIndex: 904, startIndex: 0 },
  ],
  0,
);

// Test case 7: Start in the middle of an array, end in another
runTest(
  1500,
  3,
  [
    { arrayIndex: 0, endIndex: 667, startIndex: 500 },
    { arrayIndex: 0, endIndex: 834, startIndex: 667 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 834 },
    { arrayIndex: 1, endIndex: 167, startIndex: 0 },
    { arrayIndex: 1, endIndex: 334, startIndex: 167 },
    { arrayIndex: 1, endIndex: 500, startIndex: 334 },
  ],
  500,
  1000,
);

// Test case 8: Odd number of samples, prime number of workers
runTest(
  1001,
  7,
  [
    { arrayIndex: 0, endIndex: 143, startIndex: 0 },
    { arrayIndex: 0, endIndex: 286, startIndex: 143 },
    { arrayIndex: 0, endIndex: 429, startIndex: 286 },
    { arrayIndex: 0, endIndex: 572, startIndex: 429 },
    { arrayIndex: 0, endIndex: 715, startIndex: 572 },
    { arrayIndex: 0, endIndex: 858, startIndex: 715 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 858 },
    { arrayIndex: 1, endIndex: 1, startIndex: 0 },
  ],
  0,
  1000,
);

// Test case 9: Zero samples (edge case handling)
runTest(0, 5, [], 0);

// Test case 10: Start near end of one array, small number of samples
runTest(50, 3, [], 990);

runTest(
  10,
  100,
  [
    { arrayIndex: 0, endIndex: 1, startIndex: 0 },
    { arrayIndex: 0, endIndex: 2, startIndex: 1 },
    { arrayIndex: 0, endIndex: 3, startIndex: 2 },
    { arrayIndex: 0, endIndex: 4, startIndex: 3 },
    { arrayIndex: 0, endIndex: 5, startIndex: 4 },
    { arrayIndex: 0, endIndex: 6, startIndex: 5 },
    { arrayIndex: 0, endIndex: 7, startIndex: 6 },
    { arrayIndex: 0, endIndex: 8, startIndex: 7 },
    { arrayIndex: 0, endIndex: 9, startIndex: 8 },
    { arrayIndex: 0, endIndex: 10, startIndex: 9 },
  ],
  0,
);

// Test case 12: Start at the very end of an array
runTest(1000, 4, [{ arrayIndex: 0, endIndex: 1000, startIndex: 999 }], 999);

// Test case 13: Fibonacci number of samples and workers
runTest(
  233,
  13,
  [
    { arrayIndex: 0, endIndex: 18, startIndex: 0 },
    { arrayIndex: 0, endIndex: 36, startIndex: 18 },
    { arrayIndex: 0, endIndex: 54, startIndex: 36 },
    { arrayIndex: 0, endIndex: 72, startIndex: 54 },
    { arrayIndex: 0, endIndex: 90, startIndex: 72 },
    { arrayIndex: 0, endIndex: 108, startIndex: 90 },
    { arrayIndex: 0, endIndex: 126, startIndex: 108 },
    { arrayIndex: 0, endIndex: 144, startIndex: 126 },
    { arrayIndex: 0, endIndex: 162, startIndex: 144 },
    { arrayIndex: 0, endIndex: 180, startIndex: 162 },
    { arrayIndex: 0, endIndex: 198, startIndex: 180 },
    { arrayIndex: 0, endIndex: 216, startIndex: 198 },
    { arrayIndex: 0, endIndex: 233, startIndex: 216 },
  ],
  0,
);

// Test case 14: Samples spanning exactly 3 arrays
runTest(
  3000,
  7,
  [
    { arrayIndex: 0, endIndex: 143, startIndex: 0 },
    { arrayIndex: 0, endIndex: 286, startIndex: 143 },
    { arrayIndex: 0, endIndex: 429, startIndex: 286 },
    { arrayIndex: 0, endIndex: 572, startIndex: 429 },
    { arrayIndex: 0, endIndex: 715, startIndex: 572 },
    { arrayIndex: 0, endIndex: 858, startIndex: 715 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 858 },
    { arrayIndex: 1, endIndex: 143, startIndex: 0 },
    { arrayIndex: 1, endIndex: 286, startIndex: 143 },
    { arrayIndex: 1, endIndex: 429, startIndex: 286 },
    { arrayIndex: 1, endIndex: 572, startIndex: 429 },
    { arrayIndex: 1, endIndex: 715, startIndex: 572 },
    { arrayIndex: 1, endIndex: 858, startIndex: 715 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 858 },
    { arrayIndex: 2, endIndex: 143, startIndex: 0 },
    { arrayIndex: 2, endIndex: 286, startIndex: 143 },
    { arrayIndex: 2, endIndex: 429, startIndex: 286 },
    { arrayIndex: 2, endIndex: 572, startIndex: 429 },
    { arrayIndex: 2, endIndex: 715, startIndex: 572 },
    { arrayIndex: 2, endIndex: 858, startIndex: 715 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 858 },
  ],
  0,
  1000,
);

// Test case 15: Prime number of samples, power of 2 workers
runTest(
  1009,
  16,
  [
    { arrayIndex: 0, endIndex: 63, startIndex: 0 },
    { arrayIndex: 0, endIndex: 126, startIndex: 63 },
    { arrayIndex: 0, endIndex: 189, startIndex: 126 },
    { arrayIndex: 0, endIndex: 252, startIndex: 189 },
    { arrayIndex: 0, endIndex: 315, startIndex: 252 },
    { arrayIndex: 0, endIndex: 378, startIndex: 315 },
    { arrayIndex: 0, endIndex: 441, startIndex: 378 },
    { arrayIndex: 0, endIndex: 504, startIndex: 441 },
    { arrayIndex: 0, endIndex: 567, startIndex: 504 },
    { arrayIndex: 0, endIndex: 630, startIndex: 567 },
    { arrayIndex: 0, endIndex: 693, startIndex: 630 },
    { arrayIndex: 0, endIndex: 756, startIndex: 693 },
    { arrayIndex: 0, endIndex: 819, startIndex: 756 },
    { arrayIndex: 0, endIndex: 882, startIndex: 819 },
    { arrayIndex: 0, endIndex: 945, startIndex: 882 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 945 },
    { arrayIndex: 1, endIndex: 1, startIndex: 0 },
    { arrayIndex: 1, endIndex: 2, startIndex: 1 },
    { arrayIndex: 1, endIndex: 3, startIndex: 2 },
    { arrayIndex: 1, endIndex: 4, startIndex: 3 },
    { arrayIndex: 1, endIndex: 5, startIndex: 4 },
    { arrayIndex: 1, endIndex: 6, startIndex: 5 },
    { arrayIndex: 1, endIndex: 7, startIndex: 6 },
    { arrayIndex: 1, endIndex: 8, startIndex: 7 },
    { arrayIndex: 1, endIndex: 9, startIndex: 8 },
  ],
  0,
  1000,
);

// Test case 16: Starting from the middle of one array, spanning multiple arrays, ending in the middle of another
runTest(
  2500,
  5,
  [
    { arrayIndex: 0, endIndex: 600, startIndex: 500 },
    { arrayIndex: 0, endIndex: 700, startIndex: 600 },
    { arrayIndex: 0, endIndex: 800, startIndex: 700 },
    { arrayIndex: 0, endIndex: 900, startIndex: 800 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 900 },
    { arrayIndex: 1, endIndex: 200, startIndex: 0 },
    { arrayIndex: 1, endIndex: 400, startIndex: 200 },
    { arrayIndex: 1, endIndex: 600, startIndex: 400 },
    { arrayIndex: 1, endIndex: 800, startIndex: 600 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 800 },
    { arrayIndex: 2, endIndex: 100, startIndex: 0 },
    { arrayIndex: 2, endIndex: 200, startIndex: 100 },
    { arrayIndex: 2, endIndex: 300, startIndex: 200 },
    { arrayIndex: 2, endIndex: 400, startIndex: 300 },
    { arrayIndex: 2, endIndex: 500, startIndex: 400 },
  ],
  500,
  1000,
);

// Test case 17: Extremely large number of workers (stress test)
runTest(
  10_000,
  1000,
  Array.from({ length: 1000 }, (_, index) => ({
    arrayIndex: Math.floor((index * 10) / 1000),
    endIndex:
      ((index + 1) * 10) % 1000 === 0 ? 1000 : ((index + 1) * 10) % 1000,
    startIndex: (index * 10) % 1000,
  })),
  0,
  1000,
);

// Test case 18: One sample per array across multiple arrays
runTest(
  10,
  5,
  [
    { arrayIndex: 0, endIndex: 2, startIndex: 0 },
    { arrayIndex: 0, endIndex: 4, startIndex: 2 },
    { arrayIndex: 0, endIndex: 6, startIndex: 4 },
    { arrayIndex: 0, endIndex: 8, startIndex: 6 },
    { arrayIndex: 0, endIndex: 10, startIndex: 8 },
  ],
  0,
);

// Test case 19: Start and end in the same sample
runTest(501, 1, [{ arrayIndex: 0, endIndex: 501, startIndex: 500 }], 500);
runTest(501, 4, [{ arrayIndex: 0, endIndex: 501, startIndex: 500 }], 500);

runTest(
  8000,
  16,
  [
    { arrayIndex: 0, endIndex: 500, startIndex: 0 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 1, endIndex: 500, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 2, endIndex: 500, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 3, endIndex: 500, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 4, endIndex: 500, startIndex: 0 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 5, endIndex: 500, startIndex: 0 },
    { arrayIndex: 5, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 6, endIndex: 500, startIndex: 0 },
    { arrayIndex: 6, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 7, endIndex: 500, startIndex: 0 },
    { arrayIndex: 7, endIndex: 1000, startIndex: 500 },
  ],
  0,
  1000,
);

// Test case 20: Maximum possible samples (assuming 32-bit integer limit)
runTest(
  10_000,
  16,
  [
    { arrayIndex: 0, endIndex: 500, startIndex: 0 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 1, endIndex: 500, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 2, endIndex: 500, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 3, endIndex: 500, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 4, endIndex: 500, startIndex: 0 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 5, endIndex: 500, startIndex: 0 },
    { arrayIndex: 5, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 6, endIndex: 500, startIndex: 0 },
    { arrayIndex: 6, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 7, endIndex: 500, startIndex: 0 },
    { arrayIndex: 7, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 8, endIndex: 125, startIndex: 0 },
    { arrayIndex: 8, endIndex: 250, startIndex: 125 },
    { arrayIndex: 8, endIndex: 375, startIndex: 250 },
    { arrayIndex: 8, endIndex: 500, startIndex: 375 },
    { arrayIndex: 8, endIndex: 625, startIndex: 500 },
    { arrayIndex: 8, endIndex: 750, startIndex: 625 },
    { arrayIndex: 8, endIndex: 875, startIndex: 750 },
    { arrayIndex: 8, endIndex: 1000, startIndex: 875 },
    { arrayIndex: 9, endIndex: 125, startIndex: 0 },
    { arrayIndex: 9, endIndex: 250, startIndex: 125 },
    { arrayIndex: 9, endIndex: 375, startIndex: 250 },
    { arrayIndex: 9, endIndex: 500, startIndex: 375 },
    { arrayIndex: 9, endIndex: 625, startIndex: 500 },
    { arrayIndex: 9, endIndex: 750, startIndex: 625 },
    { arrayIndex: 9, endIndex: 875, startIndex: 750 },
    { arrayIndex: 9, endIndex: 1000, startIndex: 875 },
  ],
  0,
  1000,
);

runTest(
  8000,
  16,
  [
    { arrayIndex: 0, endIndex: 500, startIndex: 0 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 1, endIndex: 500, startIndex: 0 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 2, endIndex: 500, startIndex: 0 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 3, endIndex: 500, startIndex: 0 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 4, endIndex: 500, startIndex: 0 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 5, endIndex: 500, startIndex: 0 },
    { arrayIndex: 5, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 6, endIndex: 500, startIndex: 0 },
    { arrayIndex: 6, endIndex: 1000, startIndex: 500 },
    { arrayIndex: 7, endIndex: 500, startIndex: 0 },
    { arrayIndex: 7, endIndex: 1000, startIndex: 500 },
  ],
  0,
  1000,
);

// Test case 21: Typical small-scale scenario
runTest(
  1000,
  4,
  [
    { arrayIndex: 0, endIndex: 250, startIndex: 0 },
    { arrayIndex: 0, endIndex: 500, startIndex: 250 },
    { arrayIndex: 0, endIndex: 750, startIndex: 500 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 750 },
  ],
  0,
);

// Test case 22: Medium-scale scenario with odd starting sample
runTest(
  3 * 1024,
  8,
  [
    { arrayIndex: 0, endIndex: 236, startIndex: 123 },
    { arrayIndex: 0, endIndex: 349, startIndex: 236 },
    { arrayIndex: 0, endIndex: 462, startIndex: 349 },
    { arrayIndex: 0, endIndex: 575, startIndex: 462 },
    { arrayIndex: 0, endIndex: 688, startIndex: 575 },
    { arrayIndex: 0, endIndex: 801, startIndex: 688 },
    { arrayIndex: 0, endIndex: 914, startIndex: 801 },
    { arrayIndex: 0, endIndex: 1024, startIndex: 914 },
    { arrayIndex: 1, endIndex: 256, startIndex: 0 },
    { arrayIndex: 1, endIndex: 512, startIndex: 256 },
    { arrayIndex: 1, endIndex: 768, startIndex: 512 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 2, endIndex: 256, startIndex: 0 },
    { arrayIndex: 2, endIndex: 512, startIndex: 256 },
    { arrayIndex: 2, endIndex: 768, startIndex: 512 },
    { arrayIndex: 2, endIndex: 1024, startIndex: 768 },
  ],
  123,
);

runTest(
  3000,
  8,
  [
    { arrayIndex: 0, endIndex: 233, startIndex: 123 },
    { arrayIndex: 0, endIndex: 343, startIndex: 233 },
    { arrayIndex: 0, endIndex: 453, startIndex: 343 },
    { arrayIndex: 0, endIndex: 563, startIndex: 453 },
    { arrayIndex: 0, endIndex: 673, startIndex: 563 },
    { arrayIndex: 0, endIndex: 783, startIndex: 673 },
    { arrayIndex: 0, endIndex: 893, startIndex: 783 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 893 },
    { arrayIndex: 1, endIndex: 250, startIndex: 0 },
    { arrayIndex: 1, endIndex: 500, startIndex: 250 },
    { arrayIndex: 1, endIndex: 750, startIndex: 500 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 2, endIndex: 250, startIndex: 0 },
    { arrayIndex: 2, endIndex: 500, startIndex: 250 },
    { arrayIndex: 2, endIndex: 750, startIndex: 500 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 750 },
  ],
  123,
  1000,
);

// Test case 23: Large-scale scenario with maximum realistic worker count
runTest(
  10_000,
  20,
  [
    { arrayIndex: 0, endIndex: 800, startIndex: 789 },
    { arrayIndex: 0, endIndex: 811, startIndex: 800 },
    { arrayIndex: 0, endIndex: 822, startIndex: 811 },
    { arrayIndex: 0, endIndex: 833, startIndex: 822 },
    { arrayIndex: 0, endIndex: 844, startIndex: 833 },
    { arrayIndex: 0, endIndex: 855, startIndex: 844 },
    { arrayIndex: 0, endIndex: 866, startIndex: 855 },
    { arrayIndex: 0, endIndex: 877, startIndex: 866 },
    { arrayIndex: 0, endIndex: 888, startIndex: 877 },
    { arrayIndex: 0, endIndex: 899, startIndex: 888 },
    { arrayIndex: 0, endIndex: 910, startIndex: 899 },
    { arrayIndex: 0, endIndex: 921, startIndex: 910 },
    { arrayIndex: 0, endIndex: 932, startIndex: 921 },
    { arrayIndex: 0, endIndex: 943, startIndex: 932 },
    { arrayIndex: 0, endIndex: 954, startIndex: 943 },
    { arrayIndex: 0, endIndex: 965, startIndex: 954 },
    { arrayIndex: 0, endIndex: 976, startIndex: 965 },
    { arrayIndex: 0, endIndex: 987, startIndex: 976 },
    { arrayIndex: 0, endIndex: 998, startIndex: 987 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 998 },
    { arrayIndex: 1, endIndex: 250, startIndex: 0 },
    { arrayIndex: 1, endIndex: 500, startIndex: 250 },
    { arrayIndex: 1, endIndex: 750, startIndex: 500 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 2, endIndex: 250, startIndex: 0 },
    { arrayIndex: 2, endIndex: 500, startIndex: 250 },
    { arrayIndex: 2, endIndex: 750, startIndex: 500 },
    { arrayIndex: 2, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 3, endIndex: 250, startIndex: 0 },
    { arrayIndex: 3, endIndex: 500, startIndex: 250 },
    { arrayIndex: 3, endIndex: 750, startIndex: 500 },
    { arrayIndex: 3, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 4, endIndex: 250, startIndex: 0 },
    { arrayIndex: 4, endIndex: 500, startIndex: 250 },
    { arrayIndex: 4, endIndex: 750, startIndex: 500 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 5, endIndex: 250, startIndex: 0 },
    { arrayIndex: 5, endIndex: 500, startIndex: 250 },
    { arrayIndex: 5, endIndex: 750, startIndex: 500 },
    { arrayIndex: 5, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 6, endIndex: 200, startIndex: 0 },
    { arrayIndex: 6, endIndex: 400, startIndex: 200 },
    { arrayIndex: 6, endIndex: 600, startIndex: 400 },
    { arrayIndex: 6, endIndex: 800, startIndex: 600 },
    { arrayIndex: 6, endIndex: 1000, startIndex: 800 },
    { arrayIndex: 7, endIndex: 200, startIndex: 0 },
    { arrayIndex: 7, endIndex: 400, startIndex: 200 },
    { arrayIndex: 7, endIndex: 600, startIndex: 400 },
    { arrayIndex: 7, endIndex: 800, startIndex: 600 },
    { arrayIndex: 7, endIndex: 1000, startIndex: 800 },
    { arrayIndex: 8, endIndex: 200, startIndex: 0 },
    { arrayIndex: 8, endIndex: 400, startIndex: 200 },
    { arrayIndex: 8, endIndex: 600, startIndex: 400 },
    { arrayIndex: 8, endIndex: 800, startIndex: 600 },
    { arrayIndex: 8, endIndex: 1000, startIndex: 800 },
    { arrayIndex: 9, endIndex: 200, startIndex: 0 },
    { arrayIndex: 9, endIndex: 400, startIndex: 200 },
    { arrayIndex: 9, endIndex: 600, startIndex: 400 },
    { arrayIndex: 9, endIndex: 800, startIndex: 600 },
    { arrayIndex: 9, endIndex: 1000, startIndex: 800 },
  ],
  789,
  1000,
);

runTest(
  10_000,
  20,
  [
    { arrayIndex: 0, endIndex: 801, startIndex: 789 },
    { arrayIndex: 0, endIndex: 813, startIndex: 801 },
    { arrayIndex: 0, endIndex: 825, startIndex: 813 },
    { arrayIndex: 0, endIndex: 837, startIndex: 825 },
    { arrayIndex: 0, endIndex: 849, startIndex: 837 },
    { arrayIndex: 0, endIndex: 861, startIndex: 849 },
    { arrayIndex: 0, endIndex: 873, startIndex: 861 },
    { arrayIndex: 0, endIndex: 885, startIndex: 873 },
    { arrayIndex: 0, endIndex: 897, startIndex: 885 },
    { arrayIndex: 0, endIndex: 909, startIndex: 897 },
    { arrayIndex: 0, endIndex: 921, startIndex: 909 },
    { arrayIndex: 0, endIndex: 933, startIndex: 921 },
    { arrayIndex: 0, endIndex: 945, startIndex: 933 },
    { arrayIndex: 0, endIndex: 957, startIndex: 945 },
    { arrayIndex: 0, endIndex: 969, startIndex: 957 },
    { arrayIndex: 0, endIndex: 981, startIndex: 969 },
    { arrayIndex: 0, endIndex: 993, startIndex: 981 },
    { arrayIndex: 0, endIndex: 1005, startIndex: 993 },
    { arrayIndex: 0, endIndex: 1017, startIndex: 1005 },
    { arrayIndex: 0, endIndex: 1024, startIndex: 1017 },
    { arrayIndex: 1, endIndex: 256, startIndex: 0 },
    { arrayIndex: 1, endIndex: 512, startIndex: 256 },
    { arrayIndex: 1, endIndex: 768, startIndex: 512 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 2, endIndex: 256, startIndex: 0 },
    { arrayIndex: 2, endIndex: 512, startIndex: 256 },
    { arrayIndex: 2, endIndex: 768, startIndex: 512 },
    { arrayIndex: 2, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 3, endIndex: 256, startIndex: 0 },
    { arrayIndex: 3, endIndex: 512, startIndex: 256 },
    { arrayIndex: 3, endIndex: 768, startIndex: 512 },
    { arrayIndex: 3, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 4, endIndex: 256, startIndex: 0 },
    { arrayIndex: 4, endIndex: 512, startIndex: 256 },
    { arrayIndex: 4, endIndex: 768, startIndex: 512 },
    { arrayIndex: 4, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 5, endIndex: 256, startIndex: 0 },
    { arrayIndex: 5, endIndex: 512, startIndex: 256 },
    { arrayIndex: 5, endIndex: 768, startIndex: 512 },
    { arrayIndex: 5, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 6, endIndex: 103, startIndex: 0 },
    { arrayIndex: 6, endIndex: 206, startIndex: 103 },
    { arrayIndex: 6, endIndex: 309, startIndex: 206 },
    { arrayIndex: 6, endIndex: 412, startIndex: 309 },
    { arrayIndex: 6, endIndex: 515, startIndex: 412 },
    { arrayIndex: 6, endIndex: 618, startIndex: 515 },
    { arrayIndex: 6, endIndex: 721, startIndex: 618 },
    { arrayIndex: 6, endIndex: 824, startIndex: 721 },
    { arrayIndex: 6, endIndex: 927, startIndex: 824 },
    { arrayIndex: 6, endIndex: 1024, startIndex: 927 },
    { arrayIndex: 7, endIndex: 103, startIndex: 0 },
    { arrayIndex: 7, endIndex: 206, startIndex: 103 },
    { arrayIndex: 7, endIndex: 309, startIndex: 206 },
    { arrayIndex: 7, endIndex: 412, startIndex: 309 },
    { arrayIndex: 7, endIndex: 515, startIndex: 412 },
    { arrayIndex: 7, endIndex: 618, startIndex: 515 },
    { arrayIndex: 7, endIndex: 721, startIndex: 618 },
    { arrayIndex: 7, endIndex: 824, startIndex: 721 },
    { arrayIndex: 7, endIndex: 927, startIndex: 824 },
    { arrayIndex: 7, endIndex: 1024, startIndex: 927 },
    { arrayIndex: 8, endIndex: 52, startIndex: 0 },
    { arrayIndex: 8, endIndex: 104, startIndex: 52 },
    { arrayIndex: 8, endIndex: 156, startIndex: 104 },
    { arrayIndex: 8, endIndex: 208, startIndex: 156 },
    { arrayIndex: 8, endIndex: 260, startIndex: 208 },
    { arrayIndex: 8, endIndex: 312, startIndex: 260 },
    { arrayIndex: 8, endIndex: 364, startIndex: 312 },
    { arrayIndex: 8, endIndex: 416, startIndex: 364 },
    { arrayIndex: 8, endIndex: 468, startIndex: 416 },
    { arrayIndex: 8, endIndex: 520, startIndex: 468 },
    { arrayIndex: 8, endIndex: 572, startIndex: 520 },
    { arrayIndex: 8, endIndex: 624, startIndex: 572 },
    { arrayIndex: 8, endIndex: 676, startIndex: 624 },
    { arrayIndex: 8, endIndex: 728, startIndex: 676 },
    { arrayIndex: 8, endIndex: 780, startIndex: 728 },
    { arrayIndex: 8, endIndex: 832, startIndex: 780 },
    { arrayIndex: 8, endIndex: 884, startIndex: 832 },
    { arrayIndex: 8, endIndex: 936, startIndex: 884 },
    { arrayIndex: 8, endIndex: 988, startIndex: 936 },
    { arrayIndex: 8, endIndex: 1024, startIndex: 988 },
    { arrayIndex: 9, endIndex: 40, startIndex: 0 },
    { arrayIndex: 9, endIndex: 80, startIndex: 40 },
    { arrayIndex: 9, endIndex: 120, startIndex: 80 },
    { arrayIndex: 9, endIndex: 160, startIndex: 120 },
    { arrayIndex: 9, endIndex: 200, startIndex: 160 },
    { arrayIndex: 9, endIndex: 240, startIndex: 200 },
    { arrayIndex: 9, endIndex: 280, startIndex: 240 },
    { arrayIndex: 9, endIndex: 320, startIndex: 280 },
    { arrayIndex: 9, endIndex: 360, startIndex: 320 },
    { arrayIndex: 9, endIndex: 400, startIndex: 360 },
    { arrayIndex: 9, endIndex: 440, startIndex: 400 },
    { arrayIndex: 9, endIndex: 480, startIndex: 440 },
    { arrayIndex: 9, endIndex: 520, startIndex: 480 },
    { arrayIndex: 9, endIndex: 560, startIndex: 520 },
    { arrayIndex: 9, endIndex: 600, startIndex: 560 },
    { arrayIndex: 9, endIndex: 640, startIndex: 600 },
    { arrayIndex: 9, endIndex: 680, startIndex: 640 },
    { arrayIndex: 9, endIndex: 720, startIndex: 680 },
    { arrayIndex: 9, endIndex: 760, startIndex: 720 },
    { arrayIndex: 9, endIndex: 784, startIndex: 760 },
  ],
  789,
);
runTest(
  10 * 1024,
  20,
  [
    { arrayIndex: 0, endIndex: 801, startIndex: 789 },
    { arrayIndex: 0, endIndex: 813, startIndex: 801 },
    { arrayIndex: 0, endIndex: 825, startIndex: 813 },
    { arrayIndex: 0, endIndex: 837, startIndex: 825 },
    { arrayIndex: 0, endIndex: 849, startIndex: 837 },
    { arrayIndex: 0, endIndex: 861, startIndex: 849 },
    { arrayIndex: 0, endIndex: 873, startIndex: 861 },
    { arrayIndex: 0, endIndex: 885, startIndex: 873 },
    { arrayIndex: 0, endIndex: 897, startIndex: 885 },
    { arrayIndex: 0, endIndex: 909, startIndex: 897 },
    { arrayIndex: 0, endIndex: 921, startIndex: 909 },
    { arrayIndex: 0, endIndex: 933, startIndex: 921 },
    { arrayIndex: 0, endIndex: 945, startIndex: 933 },
    { arrayIndex: 0, endIndex: 957, startIndex: 945 },
    { arrayIndex: 0, endIndex: 969, startIndex: 957 },
    { arrayIndex: 0, endIndex: 981, startIndex: 969 },
    { arrayIndex: 0, endIndex: 993, startIndex: 981 },
    { arrayIndex: 0, endIndex: 1005, startIndex: 993 },
    { arrayIndex: 0, endIndex: 1017, startIndex: 1005 },
    { arrayIndex: 0, endIndex: 1024, startIndex: 1017 },
    { arrayIndex: 1, endIndex: 256, startIndex: 0 },
    { arrayIndex: 1, endIndex: 512, startIndex: 256 },
    { arrayIndex: 1, endIndex: 768, startIndex: 512 },
    { arrayIndex: 1, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 2, endIndex: 256, startIndex: 0 },
    { arrayIndex: 2, endIndex: 512, startIndex: 256 },
    { arrayIndex: 2, endIndex: 768, startIndex: 512 },
    { arrayIndex: 2, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 3, endIndex: 256, startIndex: 0 },
    { arrayIndex: 3, endIndex: 512, startIndex: 256 },
    { arrayIndex: 3, endIndex: 768, startIndex: 512 },
    { arrayIndex: 3, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 4, endIndex: 256, startIndex: 0 },
    { arrayIndex: 4, endIndex: 512, startIndex: 256 },
    { arrayIndex: 4, endIndex: 768, startIndex: 512 },
    { arrayIndex: 4, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 5, endIndex: 256, startIndex: 0 },
    { arrayIndex: 5, endIndex: 512, startIndex: 256 },
    { arrayIndex: 5, endIndex: 768, startIndex: 512 },
    { arrayIndex: 5, endIndex: 1024, startIndex: 768 },
    { arrayIndex: 6, endIndex: 205, startIndex: 0 },
    { arrayIndex: 6, endIndex: 410, startIndex: 205 },
    { arrayIndex: 6, endIndex: 615, startIndex: 410 },
    { arrayIndex: 6, endIndex: 820, startIndex: 615 },
    { arrayIndex: 6, endIndex: 1024, startIndex: 820 },
    { arrayIndex: 7, endIndex: 205, startIndex: 0 },
    { arrayIndex: 7, endIndex: 410, startIndex: 205 },
    { arrayIndex: 7, endIndex: 615, startIndex: 410 },
    { arrayIndex: 7, endIndex: 820, startIndex: 615 },
    { arrayIndex: 7, endIndex: 1024, startIndex: 820 },
    { arrayIndex: 8, endIndex: 205, startIndex: 0 },
    { arrayIndex: 8, endIndex: 410, startIndex: 205 },
    { arrayIndex: 8, endIndex: 615, startIndex: 410 },
    { arrayIndex: 8, endIndex: 820, startIndex: 615 },
    { arrayIndex: 8, endIndex: 1024, startIndex: 820 },
    { arrayIndex: 9, endIndex: 205, startIndex: 0 },
    { arrayIndex: 9, endIndex: 410, startIndex: 205 },
    { arrayIndex: 9, endIndex: 615, startIndex: 410 },
    { arrayIndex: 9, endIndex: 820, startIndex: 615 },
    { arrayIndex: 9, endIndex: 1024, startIndex: 820 },
  ],
  789,
);

// Test case 24: Starting near the end of an array
runTest(
  2000,
  6,
  [
    { arrayIndex: 0, endIndex: 959, startIndex: 950 },
    { arrayIndex: 0, endIndex: 968, startIndex: 959 },
    { arrayIndex: 0, endIndex: 977, startIndex: 968 },
    { arrayIndex: 0, endIndex: 986, startIndex: 977 },
    { arrayIndex: 0, endIndex: 995, startIndex: 986 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 995 },
    { arrayIndex: 1, endIndex: 167, startIndex: 0 },
    { arrayIndex: 1, endIndex: 334, startIndex: 167 },
    { arrayIndex: 1, endIndex: 501, startIndex: 334 },
    { arrayIndex: 1, endIndex: 668, startIndex: 501 },
    { arrayIndex: 1, endIndex: 835, startIndex: 668 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 835 },
  ],
  950,
  1000,
);

// Test case 25: Uneven distribution with prime number of samples
runTest(
  2003,
  7,
  [
    { arrayIndex: 0, endIndex: 143, startIndex: 0 },
    { arrayIndex: 0, endIndex: 286, startIndex: 143 },
    { arrayIndex: 0, endIndex: 429, startIndex: 286 },
    { arrayIndex: 0, endIndex: 572, startIndex: 429 },
    { arrayIndex: 0, endIndex: 715, startIndex: 572 },
    { arrayIndex: 0, endIndex: 858, startIndex: 715 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 858 },
    { arrayIndex: 1, endIndex: 143, startIndex: 0 },
    { arrayIndex: 1, endIndex: 286, startIndex: 143 },
    { arrayIndex: 1, endIndex: 429, startIndex: 286 },
    { arrayIndex: 1, endIndex: 572, startIndex: 429 },
    { arrayIndex: 1, endIndex: 715, startIndex: 572 },
    { arrayIndex: 1, endIndex: 858, startIndex: 715 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 858 },
    { arrayIndex: 2, endIndex: 1, startIndex: 0 },
    { arrayIndex: 2, endIndex: 2, startIndex: 1 },
    { arrayIndex: 2, endIndex: 3, startIndex: 2 },
  ],
  0,
  1000,
);

// Test case 26: Few samples, many workers
runTest(
  50,
  16,
  [
    { arrayIndex: 0, endIndex: 4, startIndex: 0 },
    { arrayIndex: 0, endIndex: 8, startIndex: 4 },
    { arrayIndex: 0, endIndex: 12, startIndex: 8 },
    { arrayIndex: 0, endIndex: 16, startIndex: 12 },
    { arrayIndex: 0, endIndex: 20, startIndex: 16 },
    { arrayIndex: 0, endIndex: 24, startIndex: 20 },
    { arrayIndex: 0, endIndex: 28, startIndex: 24 },
    { arrayIndex: 0, endIndex: 32, startIndex: 28 },
    { arrayIndex: 0, endIndex: 36, startIndex: 32 },
    { arrayIndex: 0, endIndex: 40, startIndex: 36 },
    { arrayIndex: 0, endIndex: 44, startIndex: 40 },
    { arrayIndex: 0, endIndex: 48, startIndex: 44 },
    { arrayIndex: 0, endIndex: 50, startIndex: 48 },
  ],
  0,
);

// Test case 27: Starting in the middle of a large dataset
runTest(
  9000,
  12,
  [
    { arrayIndex: 4, endIndex: 542, startIndex: 500 },
    { arrayIndex: 4, endIndex: 584, startIndex: 542 },
    { arrayIndex: 4, endIndex: 626, startIndex: 584 },
    { arrayIndex: 4, endIndex: 668, startIndex: 626 },
    { arrayIndex: 4, endIndex: 710, startIndex: 668 },
    { arrayIndex: 4, endIndex: 752, startIndex: 710 },
    { arrayIndex: 4, endIndex: 794, startIndex: 752 },
    { arrayIndex: 4, endIndex: 836, startIndex: 794 },
    { arrayIndex: 4, endIndex: 878, startIndex: 836 },
    { arrayIndex: 4, endIndex: 920, startIndex: 878 },
    { arrayIndex: 4, endIndex: 962, startIndex: 920 },
    { arrayIndex: 4, endIndex: 1000, startIndex: 962 },
    { arrayIndex: 5, endIndex: 334, startIndex: 0 },
    { arrayIndex: 5, endIndex: 668, startIndex: 334 },
    { arrayIndex: 5, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 6, endIndex: 334, startIndex: 0 },
    { arrayIndex: 6, endIndex: 668, startIndex: 334 },
    { arrayIndex: 6, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 7, endIndex: 334, startIndex: 0 },
    { arrayIndex: 7, endIndex: 668, startIndex: 334 },
    { arrayIndex: 7, endIndex: 1000, startIndex: 668 },
    { arrayIndex: 8, endIndex: 334, startIndex: 0 },
    { arrayIndex: 8, endIndex: 668, startIndex: 334 },
    { arrayIndex: 8, endIndex: 1000, startIndex: 668 },
  ],
  4500,
  1000,
);

// Test case 28: Exactly one sample per worker
runTest(
  16,
  16,
  Array.from({ length: 16 }, (_, index) => ({
    arrayIndex: 0,
    endIndex: index + 1,
    startIndex: index,
  })),
  0,
);

// Test case 29: Small remainder at the end
runTest(
  1005,
  4,
  [
    { arrayIndex: 0, endIndex: 250, startIndex: 0 },
    { arrayIndex: 0, endIndex: 500, startIndex: 250 },
    { arrayIndex: 0, endIndex: 750, startIndex: 500 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 750 },
    { arrayIndex: 1, endIndex: 2, startIndex: 0 },
    { arrayIndex: 1, endIndex: 4, startIndex: 2 },
    { arrayIndex: 1, endIndex: 5, startIndex: 4 },
  ],
  0,
  1000,
);

// Test case 30: Starting at the very beginning of a new array
runTest(
  2000,
  8,
  [
    { arrayIndex: 1, endIndex: 125, startIndex: 0 },
    { arrayIndex: 1, endIndex: 250, startIndex: 125 },
    { arrayIndex: 1, endIndex: 375, startIndex: 250 },
    { arrayIndex: 1, endIndex: 500, startIndex: 375 },
    { arrayIndex: 1, endIndex: 625, startIndex: 500 },
    { arrayIndex: 1, endIndex: 750, startIndex: 625 },
    { arrayIndex: 1, endIndex: 875, startIndex: 750 },
    { arrayIndex: 1, endIndex: 1000, startIndex: 875 },
  ],
  1000,
  1000,
);

runTest(
  1005,
  4,
  [
    { arrayIndex: 0, endIndex: 999, startIndex: 998 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 999 },
    { arrayIndex: 1, endIndex: 3, startIndex: 0 },
    { arrayIndex: 1, endIndex: 5, startIndex: 3 },
  ],
  998,
  1000,
);

runTest(
  1044,
  4,
  [
    { arrayIndex: 0, endIndex: 999, startIndex: 998 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 999 },
    { arrayIndex: 1, endIndex: 22, startIndex: 0 },
    { arrayIndex: 1, endIndex: 44, startIndex: 22 },
  ],
  998,
  1000,
);

runTest(
  1045,
  4,
  [
    { arrayIndex: 0, endIndex: 999, startIndex: 998 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 999 },
    { arrayIndex: 1, endIndex: 12, startIndex: 0 },
    { arrayIndex: 1, endIndex: 24, startIndex: 12 },
    { arrayIndex: 1, endIndex: 36, startIndex: 24 },
    { arrayIndex: 1, endIndex: 45, startIndex: 36 },
  ],
  998,
  1000,
);

runTest(
  1044,
  16,
  [
    { arrayIndex: 0, endIndex: 999, startIndex: 998 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 999 },
    { arrayIndex: 1, endIndex: 4, startIndex: 0 },
    { arrayIndex: 1, endIndex: 8, startIndex: 4 },
    { arrayIndex: 1, endIndex: 12, startIndex: 8 },
    { arrayIndex: 1, endIndex: 16, startIndex: 12 },
    { arrayIndex: 1, endIndex: 20, startIndex: 16 },
    { arrayIndex: 1, endIndex: 24, startIndex: 20 },
    { arrayIndex: 1, endIndex: 28, startIndex: 24 },
    { arrayIndex: 1, endIndex: 32, startIndex: 28 },
    { arrayIndex: 1, endIndex: 36, startIndex: 32 },
    { arrayIndex: 1, endIndex: 40, startIndex: 36 },
    { arrayIndex: 1, endIndex: 44, startIndex: 40 },
  ],
  998,
  1000,
);
runTest(
  1044,
  16,
  [
    { arrayIndex: 0, endIndex: 954, startIndex: 950 },
    { arrayIndex: 0, endIndex: 958, startIndex: 954 },
    { arrayIndex: 0, endIndex: 962, startIndex: 958 },
    { arrayIndex: 0, endIndex: 966, startIndex: 962 },
    { arrayIndex: 0, endIndex: 970, startIndex: 966 },
    { arrayIndex: 0, endIndex: 974, startIndex: 970 },
    { arrayIndex: 0, endIndex: 978, startIndex: 974 },
    { arrayIndex: 0, endIndex: 982, startIndex: 978 },
    { arrayIndex: 0, endIndex: 986, startIndex: 982 },
    { arrayIndex: 0, endIndex: 990, startIndex: 986 },
    { arrayIndex: 0, endIndex: 994, startIndex: 990 },
    { arrayIndex: 0, endIndex: 998, startIndex: 994 },
    { arrayIndex: 0, endIndex: 1000, startIndex: 998 },
    { arrayIndex: 1, endIndex: 15, startIndex: 0 },
    { arrayIndex: 1, endIndex: 30, startIndex: 15 },
    { arrayIndex: 1, endIndex: 44, startIndex: 30 },
  ],
  950,
  1000,
);
// const base = 20;
// const multiple = 1;
// runTest(
//   1000 + multiple * base - 1,
//   16,
//   [
//     { arrayIndex: 0, endIndex: 954, startIndex: 950 },
//     { arrayIndex: 0, endIndex: 958, startIndex: 954 },
//     { arrayIndex: 0, endIndex: 962, startIndex: 958 },
//     { arrayIndex: 0, endIndex: 966, startIndex: 962 },
//     { arrayIndex: 0, endIndex: 970, startIndex: 966 },
//     { arrayIndex: 0, endIndex: 974, startIndex: 970 },
//     { arrayIndex: 0, endIndex: 978, startIndex: 974 },
//     { arrayIndex: 0, endIndex: 982, startIndex: 978 },
//     { arrayIndex: 0, endIndex: 986, startIndex: 982 },
//     { arrayIndex: 0, endIndex: 990, startIndex: 986 },
//     { arrayIndex: 0, endIndex: 994, startIndex: 990 },
//     { arrayIndex: 0, endIndex: 998, startIndex: 994 },
//     { arrayIndex: 0, endIndex: 1000, startIndex: 998 },
//     { arrayIndex: 1, endIndex: 15, startIndex: 0 },
//     { arrayIndex: 1, endIndex: 30, startIndex: 15 },
//     { arrayIndex: 1, endIndex: 44, startIndex: 30 },
//   ],
//   1000 - multiple * base + 1,
//   1000,
// );
