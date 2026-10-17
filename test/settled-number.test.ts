import "./dom-shim.js";

import { act, createElement, type JSX, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { expect, test } from "bun:test";

import { parseCanonicalInteger, useSettledNumber } from "../src/components/input/settled-number";

interface Field {
  blur: () => void;
  change: (text: string) => void;
  draft: string;
}

interface Mount {
  field: () => Field;
  root: Root;
  setExternal: (next: number) => void;
}

const mount = async (
  initial: number,
  commits: number[],
  options: {
    accept?: (next: number) => boolean;
    emptyValue?: number | null;
    parse?: (text: string) => number;
  } = {},
): Promise<Mount> => {
  let field: Field | null = null;
  let setExternal: ((next: number) => void) | null = null;
  const root = createRoot(document.createElement("div"));
  const accept = options.accept ?? ((next: number) => next >= 0 && next <= 1);
  const parse = options.parse ?? Number.parseFloat;

  const Harness = (): JSX.Element => {
    const [value, setValue] = useState(initial);
    setExternal = setValue;
    const input = useSettledNumber({
      accept,
      commit: (next) => {
        commits.push(next);
        setValue(next);
      },
      ...(options.emptyValue === undefined ? {} : { emptyValue: options.emptyValue }),
      parse,
      value,
    });
    field = {
      blur: input.blur,
      change: input.change,
      draft: input.draft,
    };
    return createElement("div");
  };

  await act(async () => {
    root.render(createElement(Harness));
  });

  return {
    field: () => {
      if (field === null) throw new Error("field is not mounted");
      return field;
    },
    root,
    setExternal: (next) => {
      if (setExternal === null) throw new Error("field is not mounted");
      setExternal(next);
    },
  };
};

test("an accepted edit commits that number immediately", async () => {
  const commits: number[] = [];
  const view = await mount(0.1, commits);
  await act(async () => {
    view.field().change("0.1");
    view.field().change("0.12");
    view.field().change("0.125");
  });

  expect(view.field().draft).toBe("0.125");
  expect(commits).toEqual([0.12, 0.125]);
  await act(async () => {
    view.field().blur();
  });
  expect(commits).toEqual([0.12, 0.125]);
  await act(async () => {
    view.root.unmount();
  });
});

test("a number outside 0 to 1 does not commit and blur restores the last value", async () => {
  const commits: number[] = [];
  const view = await mount(0.1, commits);
  await act(async () => {
    view.field().change("1.2");
  });

  expect(view.field().draft).toBe("1.2");
  expect(commits).toEqual([]);
  await act(async () => {
    view.field().blur();
  });
  expect(view.field().draft).toBe("0.1");
  expect(commits).toEqual([]);
  await act(async () => {
    view.root.unmount();
  });
});

test("blur of an already committed number does not commit again", async () => {
  const commits: number[] = [];
  const view = await mount(0.1, commits);
  await act(async () => {
    view.field().change("0.125");
    view.field().blur();
    view.field().blur();
  });

  expect(view.field().draft).toBe("0.125");
  expect(commits).toEqual([0.125]);
  await act(async () => {
    view.root.unmount();
  });
});

test("committing the current value does not call the setter", async () => {
  const commits: number[] = [];
  const view = await mount(0.1, commits);
  await act(async () => {
    view.field().change("0.1");
    view.field().blur();
  });
  expect(commits).toEqual([]);
  expect(view.field().draft).toBe("0.1");
  await act(async () => {
    view.root.unmount();
  });
});

test("an empty draft commits its empty value on blur, not on the change", async () => {
  const commits: number[] = [];
  const view = await mount(500, commits, {
    accept: (next) => next >= 0 && next <= 10_000,
    emptyValue: 1000,
    parse: (text) => Number.parseInt(text, 10),
  });

  await act(async () => {
    view.field().change("");
  });
  expect(view.field().draft).toBe("");
  expect(commits).toEqual([]);
  await act(async () => {
    view.field().blur();
  });
  expect(view.field().draft).toBe("1000");
  expect(commits).toEqual([1000]);

  await act(async () => {
    view.field().change("");
    view.field().blur();
  });
  expect(view.field().draft).toBe("1000");
  expect(commits).toEqual([1000]);
  await act(async () => {
    view.root.unmount();
  });
});

test("a truncated integer stays a draft and blur restores the last value", async () => {
  const commits: number[] = [];
  const view = await mount(10, commits, {
    accept: (next) => next >= 1 && next <= 100,
    parse: parseCanonicalInteger,
  });

  await act(async () => {
    view.field().change("12.9");
  });
  expect(view.field().draft).toBe("12.9");
  expect(commits).toEqual([]);
  await act(async () => {
    view.field().blur();
  });
  expect(view.field().draft).toBe("10");
  expect(commits).toEqual([]);

  await act(async () => {
    view.field().change("1e4");
  });
  expect(view.field().draft).toBe("1e4");
  expect(commits).toEqual([]);
  await act(async () => {
    view.field().blur();
  });
  expect(view.field().draft).toBe("10");
  expect(commits).toEqual([]);

  await act(async () => {
    view.field().change("12");
  });
  expect(view.field().draft).toBe("12");
  expect(commits).toEqual([12]);
  await act(async () => {
    view.root.unmount();
  });
});

test("a trailing dot on a float commits that number and stays on screen", async () => {
  const commits: number[] = [];
  const view = await mount(0.1, commits);
  await act(async () => {
    view.field().change("0.");
  });
  expect(view.field().draft).toBe("0.");
  expect(commits).toEqual([0]);
  await act(async () => {
    view.field().blur();
  });
  expect(view.field().draft).toBe("0.");
  expect(commits).toEqual([0]);
  await act(async () => {
    view.root.unmount();
  });
});

test("an in-progress draft stays while a parent value replaces a settled one", async () => {
  const commits: number[] = [];
  const view = await mount(0.1, commits);
  await act(async () => {
    view.field().change("1.2");
  });
  await act(async () => {
    view.setExternal(0.9);
  });
  expect(view.field().draft).toBe("1.2");
  expect(commits).toEqual([]);

  await act(async () => {
    view.field().blur();
  });
  expect(view.field().draft).toBe("0.9");
  expect(commits).toEqual([]);

  await act(async () => {
    view.setExternal(0.4);
  });
  expect(view.field().draft).toBe("0.4");
  expect(commits).toEqual([]);
  await act(async () => {
    view.root.unmount();
  });
});
