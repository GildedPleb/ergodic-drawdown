interface ImportMeta {
  readonly dir: string;
}

declare module "bun" {
  export class Glob {
    constructor(pattern: string);
    scanSync(options: { absolute?: boolean; cwd?: string }): Iterable<string>;
  }
  export function file(path: string): {
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
  };
}

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
  export function afterAll(fn: () => Promise<void> | void): void;
  export function afterEach(fn: () => Promise<void> | void): void;
  export function beforeAll(fn: () => Promise<void> | void): void;
  export function beforeEach(fn: () => Promise<void> | void): void;
  export function expect(actual: unknown): Expectation;
  export function test(name: string, fn: () => Promise<void> | void): void;
}

declare module "node:zlib" {
  export function brotliDecompressSync(buffer: Uint8Array): Uint8Array;
}

declare module "node:child_process" {
  export function spawnSync(
    command: string,
    args: readonly string[],
    options: { cwd?: string; encoding: "utf8" },
  ): { status: number | null; stdout: string };
}
