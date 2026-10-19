import React from "react";
import ReactDOM from "react-dom/client";

import "../design/base/base.css";
import "../design/tokens/tokens.css";
import { Shell } from "./Shell";
import { ModelsPane } from "./models";

const rootElement = document.querySelector("#root");
if (rootElement === null) throw new Error("Missing #root");

const root = ReactDOM.createRoot(rootElement);

const designEnabled = import.meta.env.VITE_DESIGN_ROUTE === "1";
const designMatch = designEnabled
  ? /^\/design\/([^/]+(?:\/[^/]+)?)\/?$/.exec(window.location.pathname)
  : null;

if (designMatch !== null) {
  const story = designMatch[1] ?? "tick-toggle";
  void import("../routes/design/DesignRoute").then(({ DesignRoute }) => {
    root.render(
      <React.StrictMode>
        <DesignRoute story={story} />
      </React.StrictMode>,
    );
  });
} else {
  root.render(
    <React.StrictMode>
      <Shell>
        <ModelsPane />
      </Shell>
    </React.StrictMode>,
  );
}
