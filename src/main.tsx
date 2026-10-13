import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app";
import { ComputedProvider } from "./contexts/computed";
import { DrawdownProvider } from "./contexts/drawdown";
import { ModelProvider } from "./contexts/model";
import queryClient from "./contexts/query";
import { RenderProvider } from "./contexts/render";
import { TimeProvider } from "./contexts/time";
import { WorkerProvider } from "./contexts/workers";
import GlobalStyle from "./styled";

interface RootErrorState {
  error: Error | null;
}

class RootError extends React.Component<React.PropsWithChildren, RootErrorState> {
  override state: RootErrorState = { error: null };

  static getDerivedStateFromError(error: Error): RootErrorState {
    return { error };
  }

  override render(): React.ReactNode {
    const { error } = this.state;
    if (error !== null) {
      return (
        <pre style={{ fontFamily: "ui-monospace, monospace", margin: "2rem" }}>
          {error.name}: {error.message}
        </pre>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.querySelector("#root");
if (rootElement === null) {
  throw new Error("Missing #root");
}

const root = ReactDOM.createRoot(rootElement);

if (!crossOriginIsolated) {
  root.render(
    <p
      style={{
        fontFamily: "system-ui, sans-serif",
        margin: "2rem",
        maxWidth: "40rem",
      }}
    >
      Shared memory is unavailable because this document is not cross-origin isolated. The response
      needs Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.
      Localhost can send both over http.
    </p>,
  );
} else {
  root.render(
    <React.StrictMode>
      <RootError>
        <GlobalStyle />
        <QueryClientProvider client={queryClient}>
          <TimeProvider>
            <ModelProvider>
              <DrawdownProvider>
                <RenderProvider>
                  <WorkerProvider>
                    <ComputedProvider>
                      <App />
                    </ComputedProvider>
                  </WorkerProvider>
                </RenderProvider>
              </DrawdownProvider>
            </ModelProvider>
          </TimeProvider>
        </QueryClientProvider>
      </RootError>
    </React.StrictMode>,
  );
}
