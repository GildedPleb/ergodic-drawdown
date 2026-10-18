import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { type Engine } from "../engine/engine";
import { type EngineConfig } from "../engine/keys";
import { type Snapshot } from "../engine/snapshot";

const EngineContext = createContext<Engine | null>(null);

export const EngineProvider = ({
  children,
  engine,
}: {
  children: ReactNode;
  engine: Engine;
}): ReactNode => createElement(EngineContext.Provider, { value: engine }, children);

const useEngine = (): Engine => {
  const engine = useContext(EngineContext);
  if (engine === null) throw new Error("useEngine must be used within an EngineProvider");
  return engine;
};

export const useEngineSelector = <T>(select: (snapshot: Snapshot) => T): T => {
  const engine = useEngine();
  const subscribe = useCallback((listener: () => void) => engine.subscribe(listener), [engine]);
  const read = (): T => select(engine.get());
  return useSyncExternalStore(subscribe, read, read);
};

export const useEngineSet = (): ((config: EngineConfig) => void) => {
  const engine = useEngine();
  return useCallback(
    (config: EngineConfig) => {
      engine.set(config);
    },
    [engine],
  );
};
