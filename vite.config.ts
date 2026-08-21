import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createBuildMetadata } from "./src/application/buildMetadataFactory";

const packageMetadata = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

function localGitSha(): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

const buildMetadata = createBuildMetadata(packageMetadata.version, process.env.GITHUB_SHA ?? localGitSha());

export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    __DEMANDLINT_VERSION__: JSON.stringify(buildMetadata.version),
    __DEMANDLINT_GIT_SHA__: JSON.stringify(buildMetadata.gitCommitSha),
  },
  build: {
    rollupOptions: {
      plugins: [{
        name: "demandlint-version-metadata",
        generateBundle() {
          this.emitFile({ type: "asset", fileName: "version.json", source: `${JSON.stringify(buildMetadata, null, 2)}\n` });
        },
      }],
    },
  },
});
