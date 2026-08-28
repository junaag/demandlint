import type { RuntimeEnvironment } from "../application/runtimeEnvironment";
import { getBrowserRuntimeEnvironment } from "../composition/browserRuntimeEnvironment";

interface EnvironmentIndicatorProps {
  environment?: RuntimeEnvironment;
}

export function EnvironmentIndicator({ environment }: EnvironmentIndicatorProps) {
  const current = environment ?? getBrowserRuntimeEnvironment();
  if (!current.isLocalPreprod) return null;

  return (
    <aside className="environment-indicator" aria-label="Local pre-production environment">
      <strong>LOCAL PRE-PROD</strong>
      <span>Auth bypass · Local database</span>
    </aside>
  );
}
