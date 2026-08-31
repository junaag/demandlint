import { describe, expect, it } from "vitest";
import {
  authPageHref,
  getApplicationRoute,
  getWorkspacePage,
  intendedWorkspacePage,
  isWorkspacePage,
  workspacePageHref,
} from "../../src/application/workspaceNavigation";

describe("workspace navigation", () => {
  it("maps dedicated URLs to their workspace page", () => {
    expect(getWorkspacePage("/import")).toBe("import");
    expect(getWorkspacePage("/templates/")).toBe("templates");
    expect(getWorkspacePage("/demandlint/settings")).toBe("settings");
  });

  it("uses import as the safe default for non-workspace routes", () => {
    expect(getWorkspacePage("/")).toBe("import");
    expect(getWorkspacePage("/auth")).toBe("import");
    expect(isWorkspacePage("/auth")).toBe(false);
  });

  it("builds clean URLs at the root and GitHub Pages subpath", () => {
    expect(workspacePageHref("settings", "/")).toBe("/settings");
    expect(workspacePageHref("templates", "/demandlint/")).toBe("/demandlint/templates");
    expect(workspacePageHref("import", "/demandlint/auth")).toBe("/demandlint/import");
    expect(getApplicationRoute("/auth")).toBe("auth");
  });

  it("preserves a protected destination through auth without auth page navigation", () => {
    const href = authPageHref("/import", { next: "import" });
    expect(href).toBe("/auth?next=%2Fimport");
    expect(href).not.toContain("page=");
    expect(intendedWorkspacePage("?next=%2Ftemplates")).toBe("templates");
    expect(intendedWorkspacePage("?next=https%3A%2F%2Fevil.example%2Fimport")).toBeNull();
  });
});
