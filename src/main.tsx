import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app";
import { ComputedProvider } from "./contexts/computed";
import { DrawdownProvider } from "./contexts/drawdown";
import { ModelProvider } from "./contexts/model";
import { PriceDataProvider } from "./contexts/price";
import queryClient from "./contexts/query";
import { RenderProvider } from "./contexts/render";
import { TimeProvider } from "./contexts/time";
import { VolumeDataProvider } from "./contexts/volume";
import { WorkerProvider } from "./contexts/workers";
import GlobalStyle from "./styled";
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <GlobalStyle />
    <QueryClientProvider client={queryClient}>
      <TimeProvider>
        <ModelProvider>
          <PriceDataProvider>
            <VolumeDataProvider>
              <DrawdownProvider>
                <RenderProvider>
                  <WorkerProvider>
                    <ComputedProvider>
                      <App />
                    </ComputedProvider>
                  </WorkerProvider>
                </RenderProvider>
              </DrawdownProvider>
            </VolumeDataProvider>
          </PriceDataProvider>
        </ModelProvider>
      </TimeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
