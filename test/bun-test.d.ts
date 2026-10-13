interface Rejection {
  toThrow(expected?: string): Promise<void>;
}

interface Expectation {
  rejects: Rejection;
  toBe(expected: unknown): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeInstanceOf(expected: unknown): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeUndefined(): void;
  toEqual(expected: unknown): void;
  toThrow(expected?: string): void;
}

declare module "bun:test" {
  export function afterAll(fn: () => void): void;
  export function afterEach(fn: () => void): void;
  export function beforeAll(fn: () => void): void;
  export function beforeEach(fn: () => void): void;
  export function expect(actual: unknown): Expectation;
  export function test(name: string, fn: () => Promise<void> | void): void;
}
