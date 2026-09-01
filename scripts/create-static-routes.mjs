import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const staticRoutes = [
  "auth",
  "import",
  "templates",
  "settings",
  "terms",
  "privacy",
  "product",
  "solutions",
  "documentation",
];

const publicRouteMetadata = {
  product: {
    title: "DemandLint Product — Data Mapping, Validation & Export",
    description: "Transform inconsistent source files into predictable, validated datasets with reusable mappings, rules and export templates.",
  },
  solutions: {
    title: "DemandLint Solutions — Reliable Data Preparation for Every Team",
    description: "Create a reliable preparation layer between operational source files and the systems your teams depend on.",
  },
  documentation: {
    title: "DemandLint Documentation",
    description: "Learn how to import files, create mappings, configure templates, validate data and prepare exports with DemandLint.",
  },
};

function withRouteMetadata(html, route) {
  const metadata = publicRouteMetadata[route];
  if (!metadata) return html;
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${metadata.title}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${metadata.description}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${metadata.title}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${metadata.description}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="https://demandlint.com/${route}" />`);
}

export async function createStaticRouteEntries(outputDirectory) {
  const outputPath = resolve(outputDirectory);
  const rootHtml = await readFile(resolve(outputPath, "index.html"), "utf8");
  const nestedHtml = rootHtml.replaceAll('="./', '="../');

  await Promise.all(staticRoutes.map(async (route) => {
    const routeDirectory = resolve(outputPath, route);
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(resolve(routeDirectory, "index.html"), withRouteMetadata(nestedHtml, route), "utf8");
  }));
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  await createStaticRouteEntries(process.argv[2] ?? "dist");
}
