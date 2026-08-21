import { describe, expect, it } from "vitest";
import {
  getWorkspacePage,
  isWorkspacePage,
  workspacePageHref,
} from "../../src/application/workspaceNavigation";

describe("workspace navigation", () => {
  it("maps dedicated URLs to their workspace page", () => {
    expect(getWorkspacePage("?page=import")).toBe("import");
    expect(getWorkspacePage("?page=templates")).toBe("templates");
    expect(getWorkspacePage("?page=settings")).toBe("settings");
  });

  it("uses import as the safe default for non-workspace routes", () => {
    expect(getWorkspacePage("")).toBe("import");
    expect(getWorkspacePage("?page=login")).toBe("import");
    expect(isWorkspacePage("?page=login")).toBe(false);
  });

  it("builds reload-safe query URLs", () => {
    expect(workspacePageHref("settings", "/")).toBe("/?page=settings");
    expect(workspacePageHref("templates", "/demandlint/")).toBe("/demandlint/?page=templates");
    expect(workspacePageHref("import", "/demandlint/")).toBe("/demandlint/?page=import");
  });
});
