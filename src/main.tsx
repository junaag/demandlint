import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { EnvironmentIndicator } from "./components/EnvironmentIndicator";
import { getBrowserRuntimeEnvironment } from "./composition/browserRuntimeEnvironment";
import { PublicSite } from "./marketing/PublicSite";
import { getPublicSiteRoute } from "./marketing/publicSiteRouting";
import "./styles.css";
import "./templateEditorUx.css";

const runtimeEnvironment = getBrowserRuntimeEnvironment();
const publicSiteRoute = getPublicSiteRoute(window.location.pathname, window.location.hostname);
if (!publicSiteRoute) {
  document.title = "DemandLint";
}
const root = document.getElementById("root");
if (!root) {
  throw new Error("DemandLint root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    {publicSiteRoute ? (
      <PublicSite route={publicSiteRoute} />
    ) : (
      <>
        <EnvironmentIndicator environment={runtimeEnvironment} />
        <App />
      </>
    )}
  </StrictMode>,
);
