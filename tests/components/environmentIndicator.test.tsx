import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RuntimeEnvironment } from "../../src/application/runtimeEnvironment";
import { EnvironmentIndicator } from "../../src/components/EnvironmentIndicator";

function environment(overrides: Partial<RuntimeEnvironment>): RuntimeEnvironment {
  return {
    appEnvironment: "production",
    authMode: "supabase",
    isLocalPreprod: false,
    usesLocalSupabase: false,
    ...overrides,
  };
}

describe("EnvironmentIndicator", () => {
  it("shows the local pre-production environment details", () => {
    const html = renderToStaticMarkup(<EnvironmentIndicator environment={environment({
      appEnvironment: "preprod-local",
      authMode: "bypass",
      isLocalPreprod: true,
      usesLocalSupabase: true,
    })} />);

    expect(html).toContain("LOCAL PRE-PROD");
    expect(html).toContain("Auth bypass · Local database");
  });

  it("renders nothing in production", () => {
    expect(renderToStaticMarkup(<EnvironmentIndicator environment={environment({})} />)).toBe("");
  });
});
