export type WorkspacePage = "import" | "settings";

export function getWorkspacePage(search: string): WorkspacePage {
  return new URLSearchParams(search).get("page") === "settings" ? "settings" : "import";
}

export function isWorkspacePage(search: string): boolean {
  const page = new URLSearchParams(search).get("page");
  return page === "import" || page === "settings";
}

export function workspacePageHref(page: WorkspacePage, pathname = "/"): string {
  return `${pathname}?page=${page}`;
}
