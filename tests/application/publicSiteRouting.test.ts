import { describe, expect, it } from "vitest";
import { getPublicSiteRoute, isApplicationHostname } from "../../src/marketing/publicSiteRouting";

describe("public site routing", () => {
  it("serves the public homepage outside the application hostname", () => {
    expect(getPublicSiteRoute("/", "demandlint.com")).toBe("home");
    expect(getPublicSiteRoute("/", "localhost")).toBe("home");
  });

  it("preserves the application root on app.demandlint.com", () => {
    expect(isApplicationHostname("APP.DEMANDLINT.COM")).toBe(true);
    expect(getPublicSiteRoute("/", "app.demandlint.com")).toBeNull();
    expect(getPublicSiteRoute("/import", "demandlint.com")).toBeNull();
  });

  it("recognizes every explicit public route with direct-navigation variants", () => {
    expect(getPublicSiteRoute("/product", "demandlint.com")).toBe("product");
    expect(getPublicSiteRoute("/solutions/", "demandlint.com")).toBe("solutions");
    expect(getPublicSiteRoute("/DOCUMENTATION", "demandlint.com")).toBe("documentation");
  });
});
