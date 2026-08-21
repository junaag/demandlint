import { useEffect, useState } from "react";
import { embeddedBuildMetadata, type BuildMetadata } from "../application/buildMetadata";

export function BuildInfo() {
  const [metadata, setMetadata] = useState<BuildMetadata>(embeddedBuildMetadata);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${import.meta.env.BASE_URL}version.json`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<BuildMetadata> : null)
      .then((next) => {
        if (!cancelled && next?.version && next.gitCommitSha) setMetadata(next);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  return <span>DemandLint v{metadata.version} · {metadata.gitCommitSha.slice(0, 7)}</span>;
}
