import SparseWeekDataStructure from "./classes/variable-drawdown-cache";
import { MAX_FIAT_VARIABLES, MAX_SAMPLE_COUNT } from "./constants";

// Create a growable SharedArrayBuffer
const initialSize = 1000 * 2 * 3 * Float64Array.BYTES_PER_ELEMENT;
const maxBufferSize =
  MAX_SAMPLE_COUNT * MAX_FIAT_VARIABLES * 3 * Float64Array.BYTES_PER_ELEMENT;
const buffer = new SharedArrayBuffer(initialSize, {
  maxByteLength: maxBufferSize,
});

console.log("Testing SparseWeekDataStructure");

// Test 1: Initialization
try {
  const structure = new SparseWeekDataStructure(buffer);
  console.log("Test 1 Passed: Structure initialized successfully");
} catch (error) {
  console.error("Test 1 Failed:", error.message);
}

// Test 2: Set and Get
try {
  const structure = new SparseWeekDataStructure(buffer);
  structure.set(1, 5, 100);
  const value = structure.get(1, 5);
  console.log(
    "Test 2:",
    value === 100 ? "Passed" : "Failed",
    `(Expected 100, got ${value})`,
  );
} catch (error) {
  console.error("Test 2 Failed:", error.message);
}

// Test 3: Get non-existent value
try {
  const structure = new SparseWeekDataStructure(buffer);
  const value = structure.get(2, 10);
  console.log(
    "Test 3:",
    value === undefined ? "Passed" : "Failed",
    `(Expected undefined, got ${value})`,
  );
} catch (error) {
  console.error("Test 3 Failed:", error.message);
}

// Test 4: Invalid sample number
try {
  const structure = new SparseWeekDataStructure(buffer);
  structure.set(MAX_SAMPLE_COUNT, 1, 50);
  console.error("Test 4 Failed: Expected an error for invalid sample number");
} catch (error) {
  console.log("Test 4 Passed:", error.message);
}

// Test 5: Clear
try {
  const structure = new SparseWeekDataStructure(buffer);
  structure.set(1, 5, 100);
  structure.clear();
  const value = structure.get(1, 5);
  console.log(
    "Test 5:",
    value === undefined ? "Passed" : "Failed",
    `(Expected undefined after clear, got ${value})`,
  );
} catch (error) {
  console.error("Test 5 Failed:", error.message);
}

// Test 6: Multiple sets and gets
try {
  const structure = new SparseWeekDataStructure(buffer);
  structure.set(1, 5, 100);
  structure.set(2, 10, 200);
  structure.set(3, 15, 300);
  const value1 = structure.get(1, 5);
  const value2 = structure.get(2, 10);
  const value3 = structure.get(3, 15);
  console.log(
    "Test 6:",
    value1 === 100 && value2 === 200 && value3 === 300 ? "Passed" : "Failed",
    `(Expected 100, 200, 300; got ${value1}, ${value2}, ${value3})`,
  );
} catch (error) {
  console.error("Test 6 Failed:", error.message);
}

console.log("\nTesting growth functionality:");
try {
  const structure = new SparseWeekDataStructure(buffer);
  const initialCapacity = Math.floor(
    initialSize / (3 * Float64Array.BYTES_PER_ELEMENT),
  );
  const testData = [];

  console.log(`Initial capacity: ${initialCapacity} entries`);

  // Fill beyond initial capacity
  for (let index = 0; index < initialCapacity + 100; index++) {
    const sample = index % MAX_SAMPLE_COUNT;
    const week = Math.floor(index / MAX_SAMPLE_COUNT);
    const amount = index * 10;
    structure.set(sample, week, amount);
    testData.push({ amount, sample, week });
  }

  console.log(`Inserted ${initialCapacity + 100} entries`);

  // Verify all data is still accessible
  let allDataAccessible = true;
  for (const { amount, sample, week } of testData) {
    const retrievedAmount = structure.get(sample, week);
    if (retrievedAmount !== amount) {
      allDataAccessible = false;
      console.error(
        `Data mismatch: Expected ${amount} for sample ${sample}, week ${week}, but got ${retrievedAmount}`,
      );
      break;
    }
  }

  if (allDataAccessible) {
    console.log(
      "Test 7 Passed: Structure grew successfully and all data is accessible",
    );
  } else {
    console.log("Test 7 Failed: Not all data is accessible after growth");
  }
} catch (error) {
  console.error("Test 7 Failed:", error.message);
}

// Test 8: Extreme growth test
console.log("\nTesting extreme growth:");
try {
  const structure = new SparseWeekDataStructure(buffer);
  const maxEntries = Math.floor(
    maxBufferSize / (3 * Float64Array.BYTES_PER_ELEMENT),
  );

  console.log(
    `Attempting to insert ${maxEntries} entries (maximum theoretical capacity)`,
  );

  for (let index = 0; index < maxEntries; index++) {
    const sample = index % MAX_SAMPLE_COUNT;
    const week = Math.floor(index / MAX_SAMPLE_COUNT);
    structure.set(sample, week, index);
  }

  // Verify last inserted data is accessible
  const lastSample = (maxEntries - 1) % MAX_SAMPLE_COUNT;
  const lastWeek = Math.floor((maxEntries - 1) / MAX_SAMPLE_COUNT);
  const lastValue = structure.get(lastSample, lastWeek);

  if (lastValue === maxEntries - 1) {
    console.log(
      "Test 8 Passed: Structure grew to maximum capacity and last entry is accessible",
    );
  } else {
    console.log(
      `Test 8 Failed: Last entry mismatch. Expected ${maxEntries - 1}, got ${lastValue}`,
    );
  }
} catch (error) {
  console.error("Test 8 Failed:", error.message);
}

// Test 9: Overflow test
console.log("\nTesting overflow behavior:");
try {
  const structure = new SparseWeekDataStructure(buffer);
  const maxEntries = Math.floor(
    maxBufferSize / (3 * Float64Array.BYTES_PER_ELEMENT),
  );

  // Fill to maximum capacity
  for (let index = 0; index < maxEntries; index++) {
    const sample = index % MAX_SAMPLE_COUNT;
    const week = Math.floor(index / MAX_SAMPLE_COUNT);
    structure.set(sample, week, index);
  }

  // Attempt to add one more entry
  try {
    structure.set(0, maxEntries, maxEntries);
    console.log("Test 9 Failed: Structure did not throw an error on overflow");
  } catch (error) {
    if (error.message === "Cannot grow the buffer further.") {
      console.log(
        "Test 9 Passed: Structure correctly threw an error on overflow",
      );
    } else {
      console.log(
        "Test 9 Failed: Unexpected error on overflow:",
        error.message,
      );
    }
  }
} catch (error) {
  console.error("Test 9 Failed:", error.message);
}

console.log("Testing complete");
