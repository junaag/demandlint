import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const staticRoutes = ["auth", "import", "templates", "settings", "terms", "privacy"];

export async function createStaticRouteEntries(outputDirectory) {
  const outputPath = resolve(outputDirectory);
  const rootHtml = await readFile(resolve(outputPath, "index.html"), "utf8");
  const nestedHtml = rootHtml.replaceAll('="./', '="../');

  await Promise.all(staticRoutes.map(async (route) => {
    const routeDirectory = resolve(outputPath, route);
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(resolve(routeDirectory, "index.html"), nestedHtml, "utf8");
  }));
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  await createStaticRouteEntries(process.argv[2] ?? "dist");
}
