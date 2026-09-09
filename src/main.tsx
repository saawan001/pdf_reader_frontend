import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// @ts-expect-error App.css is bundled by the build tool but has no TypeScript declaration.
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);