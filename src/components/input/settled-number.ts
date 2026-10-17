import {
  type ChangeEventHandler,
  type KeyboardEventHandler,
  useEffect,
  useRef,
  useState,
} from "react";

import handleEnterKey from "./enter";

export const parseCanonicalInteger = (text: string): number => {
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || String(parsed) !== text) return Number.NaN;
  return parsed;
};

interface SettledNumberOptions {
  accept: (next: number) => boolean;
  commit: (next: number) => void;
  emptyValue: number | null;
  getValue: () => number;
  parse: (text: string) => number;
}

interface SettledNumberController {
  blur: () => void;
  change: (text: string) => void;
  draft: () => string;
  sync: (next: number) => void;
}

const createSettledNumber = (
  initial: number,
  options: SettledNumberOptions,
): SettledNumberController => {
  let draft = String(initial);
  let committed = initial;

  const editing = (): boolean => {
    if (draft === "") return true;
    const parsed = options.parse(draft);
    return Number.isNaN(parsed) || !options.accept(parsed);
  };

  const commitIfChanged = (next: number): void => {
    if (next === committed) return;
    committed = next;
    options.commit(next);
  };

  const commitDraft = (): void => {
    if (draft === "") {
      if (options.emptyValue !== null) {
        draft = String(options.emptyValue);
        commitIfChanged(options.emptyValue);
        return;
      }
      draft = String(options.getValue());
      return;
    }
    const parsed = options.parse(draft);
    if (!Number.isNaN(parsed) && options.accept(parsed)) {
      commitIfChanged(parsed);
      return;
    }
    draft = String(options.getValue());
  };

  return {
    blur: commitDraft,
    change: (text) => {
      draft = text;
      if (text === "") return;
      const parsed = options.parse(text);
      if (Number.isNaN(parsed) || !options.accept(parsed)) return;
      commitIfChanged(parsed);
    },
    draft: () => draft,
    sync: (next) => {
      committed = next;
      if (editing()) return;
      const parsed = options.parse(draft);
      if (parsed === next) return;
      draft = String(next);
    },
  };
};

export const useSettledNumber = ({
  accept,
  commit,
  emptyValue = null,
  parse,
  value,
}: {
  accept: (next: number) => boolean;
  commit: (next: number) => void;
  emptyValue?: number | null;
  parse: (text: string) => number;
  value: number;
}): {
  blur: () => void;
  change: (text: string) => void;
  draft: string;
  onBlur: () => void;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
} => {
  const options = useRef<SettledNumberOptions>({
    accept,
    commit,
    emptyValue,
    getValue: () => value,
    parse,
  });
  const valueRef = useRef(value);
  valueRef.current = value;
  options.current.accept = accept;
  options.current.commit = commit;
  options.current.emptyValue = emptyValue;
  options.current.getValue = () => valueRef.current;
  options.current.parse = parse;

  const controller = useRef<SettledNumberController | null>(null);
  if (controller.current === null) {
    controller.current = createSettledNumber(value, options.current);
  }
  const field = controller.current;
  const [draft, setDraft] = useState(() => field.draft());

  useEffect(() => {
    field.sync(value);
    setDraft(field.draft());
  }, [field, value]);

  const change = (text: string): void => {
    field.change(text);
    setDraft(field.draft());
  };

  const blur = (): void => {
    field.blur();
    setDraft(field.draft());
  };

  const onChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    change(event.target.value);
  };

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") blur();
    handleEnterKey(event);
  };

  return { blur, change, draft, onBlur: blur, onChange, onKeyDown };
};
