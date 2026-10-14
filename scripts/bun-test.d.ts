declare module "bun:test" {
  export function expect(actual: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
  };
  export function test(name: string, fn: () => void): void;
}
