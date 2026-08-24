import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuildInfo } from "../../src/components/BuildInfo";

describe("BuildInfo", () => {
  it("displays build-provided version and commit metadata", () => {
    const html = renderToStaticMarkup(<BuildInfo />);

    expect(html).toContain("DemandLint v0.3.3");
    expect(html).toMatch(/DemandLint v0\.3\.3 · [a-z0-9]{5,7}/);
  });
});
