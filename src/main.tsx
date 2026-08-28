import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { EnvironmentIndicator } from "./components/EnvironmentIndicator";
import { getBrowserRuntimeEnvironment } from "./composition/browserRuntimeEnvironment";
import "./styles.css";
import "./templateEditorUx.css";

const runtimeEnvironment = getBrowserRuntimeEnvironment();
const root = document.getElementById("root");
if (!root) {
  throw new Error("DemandLint root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <EnvironmentIndicator environment={runtimeEnvironment} />
    <App />
  </StrictMode>,
);
