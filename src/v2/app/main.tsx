import React from "react";
import ReactDOM from "react-dom/client";

import "../design/base/base.css";
import "../design/tokens/tokens.css";
import { createEngine } from "../../engine/engine";
import { EngineProvider } from "../../hooks/use-engine";
import { AppShell } from "./shell/AppShell";

const rootElement = document.querySelector("#root");
if (rootElement === null) throw new Error("Missing #root");

const root = ReactDOM.createRoot(rootElement);

const designEnabled = import.meta.env.VITE_DESIGN_ROUTE === "1";
// Probe m3: with the flag on, every /design path (bare, unknown or too deep) goes to the design
// route, which shows a story, the story index (bare /design) or "No story"; never the app.
const designMatch = designEnabled ? /^\/design(?:\/(.*))?$/.exec(window.location.pathname) : null;

// Dark is the default theme; ?theme=linen shows linen (the ⚙ setting ships in a later slice).
document.documentElement.dataset["theme"] =
  new URLSearchParams(window.location.search).get("theme") === "linen" ? "linen" : "dark";

if (designMatch !== null) {
  const story = (designMatch[1] ?? "").replace(/\/+$/, "");
  void import("../routes/design/DesignRoute").then(({ DesignRoute }) => {
    root.render(
      <React.StrictMode>
        <DesignRoute story={story} />
      </React.StrictMode>,
    );
  });
} else {
  // The engine's worker pool needs SharedArrayBuffer (COOP/COEP, as on main).
  const engine = crossOriginIsolated ? createEngine() : null;
  root.render(
    <React.StrictMode>
      {engine === null ? (
        <p>
          Shared memory is unavailable because this page is not cross-origin isolated. It needs
          Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.
        </p>
      ) : (
        <EngineProvider engine={engine}>
          <AppShell />
        </EngineProvider>
      )}
    </React.StrictMode>,
  );
}
