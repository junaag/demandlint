export type WorkspacePage = "import" | "templates" | "settings";

export function getWorkspacePage(search: string): WorkspacePage {
  const page = new URLSearchParams(search).get("page");
  return page === "templates" || page === "settings" ? page : "import";
}

export function isWorkspacePage(search: string): boolean {
  const page = new URLSearchParams(search).get("page");
  return page === "import" || page === "templates" || page === "settings";
}

export function workspacePageHref(page: WorkspacePage, pathname = "/"): string {
  return `${pathname}?page=${page}`;
}
