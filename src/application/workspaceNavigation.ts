export type WorkspacePage = "import" | "templates" | "settings";
export type ApplicationRoute = "auth" | WorkspacePage | "terms" | "privacy";

const workspacePages = new Set<WorkspacePage>(["import", "templates", "settings"]);
const applicationRoutes = new Set<ApplicationRoute>([
  "auth",
  "import",
  "templates",
  "settings",
  "terms",
  "privacy",
]);

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

export function getApplicationRoute(pathname: string): ApplicationRoute | null {
  const segment = pathSegments(pathname).at(-1)?.toLowerCase();
  return segment && applicationRoutes.has(segment as ApplicationRoute)
    ? segment as ApplicationRoute
    : null;
}

export function applicationBasePath(pathname: string): string {
  const segments = pathSegments(pathname);
  if (getApplicationRoute(pathname)) segments.pop();
  return segments.length ? `/${segments.join("/")}` : "";
}

export function getWorkspacePage(pathname: string): WorkspacePage {
  const route = getApplicationRoute(pathname);
  return route && workspacePages.has(route as WorkspacePage) ? route as WorkspacePage : "import";
}

export function isWorkspacePage(pathname: string): boolean {
  const route = getApplicationRoute(pathname);
  return Boolean(route && workspacePages.has(route as WorkspacePage));
}

export function workspacePageHref(page: WorkspacePage, pathname = "/"): string {
  return `${applicationBasePath(pathname)}/${page}`;
}

export function publicPageHref(page: "terms" | "privacy", pathname = "/"): string {
  return `${applicationBasePath(pathname)}/${page}`;
}

export function intendedWorkspacePage(search: string): WorkspacePage | null {
  const next = new URLSearchParams(search).get("next");
  if (!next || next.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(next)) return null;
  const route = getApplicationRoute(next);
  return route && workspacePages.has(route as WorkspacePage) ? route as WorkspacePage : null;
}

export function authPageHref(
  pathname = "/",
  options: { next?: WorkspacePage; mode?: "signup" | "login" } = {},
): string {
  const params = new URLSearchParams();
  if (options.next) params.set("next", workspacePageHref(options.next, pathname));
  if (options.mode) params.set("mode", options.mode);
  const query = params.toString();
  return `${applicationBasePath(pathname)}/auth${query ? `?${query}` : ""}`;
}
