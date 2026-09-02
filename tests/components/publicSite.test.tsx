import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicSite } from "../../src/marketing/PublicSite";

const APP_URL = "https://app.demandlint.com";

describe("public marketing site", () => {
  it.each([
    ["home", "Clean data in."],
    ["product", "One workflow for cleaner, safer data imports."],
    ["solutions", "Data preparation isn&#x27;t just a marketing problem."],
    ["documentation", "DemandLint Documentation"],
  ] as const)("renders the %s route and app CTA", (route, heading) => {
    const html = renderToStaticMarkup(<PublicSite route={route} />);
    expect(html).toContain(heading);
    expect(html).toContain(`href="${APP_URL}"`);
    expect(html).toContain("Reliable data preparation before import.");
    expect(html).toContain('class="demandlint-logo"');
    expect(html).not.toContain('marketing-brand-mark');
  });

  it("keeps the requested global navigation and omits deferred sections", () => {
    const html = renderToStaticMarkup(<PublicSite route="home" />);
    expect(html).toContain('href="/product"');
    expect(html).toContain('href="/solutions"');
    expect(html).toContain('href="/documentation"');
    expect(html).not.toContain(">Pricing<");
    expect(html).not.toContain(">Blog<");
    expect(html).not.toContain("Book a demo");
  });

  it("provides substantive documentation and mobile navigation", () => {
    const html = renderToStaticMarkup(<PublicSite route="documentation" />);
    expect(html).toContain("docs-mobile-nav");
    expect(html).toContain("Warnings and blocking errors");
    expect(html).toContain("How DemandLint processes imported data");
    expect(html).toContain("My Excel template does not work as expected");
  });
});
