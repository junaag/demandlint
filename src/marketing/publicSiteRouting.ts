export type PublicSiteRoute = "home" | "product" | "solutions" | "documentation";

const PUBLIC_ROUTE_BY_PATH = new Map<string, PublicSiteRoute>([
  ["/product", "product"],
  ["/solutions", "solutions"],
  ["/documentation", "documentation"],
]);

export function isApplicationHostname(hostname: string): boolean {
  return hostname.trim().toLowerCase() === "app.demandlint.com";
}

export function getPublicSiteRoute(pathname: string, hostname: string): PublicSiteRoute | null {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const explicitRoute = PUBLIC_ROUTE_BY_PATH.get(normalizedPath.toLowerCase());
  if (explicitRoute) return explicitRoute;
  if (normalizedPath === "/" && !isApplicationHostname(hostname)) return "home";
  return null;
}
