import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createBuildMetadata } from "./src/application/buildMetadataFactory";
import { resolveRuntimeEnvironment } from "./src/application/runtimeEnvironment";

const packageMetadata = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

function localGitSha(): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

const buildMetadata = createBuildMetadata(packageMetadata.version, process.env.GITHUB_SHA ?? localGitSha());

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  resolveRuntimeEnvironment({
    appEnvironment: environment.VITE_APP_ENV,
    authMode: environment.VITE_AUTH_MODE,
    supabaseUrl: environment.VITE_SUPABASE_URL,
    viteMode: mode,
  });

  return {
    plugins: [react()],
    base: "./",
    define: {
      __DEMANDLINT_VERSION__: JSON.stringify(buildMetadata.version),
      __DEMANDLINT_GIT_SHA__: JSON.stringify(buildMetadata.gitCommitSha),
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), "index.html"),
          auth: resolve(process.cwd(), "auth/index.html"),
        },
        plugins: [{
          name: "demandlint-version-metadata",
          generateBundle() {
            this.emitFile({ type: "asset", fileName: "version.json", source: `${JSON.stringify(buildMetadata, null, 2)}\n` });
          },
        }],
      },
    },
  };
});
