import { describe, expect, it } from "vitest";
import { resolveRuntimeEnvironment } from "../../src/application/runtimeEnvironment";

const safeBypass = {
  appEnvironment: "preprod-local",
  authMode: "bypass",
  hostname: "localhost",
  supabaseUrl: "http://127.0.0.1:54321",
  viteMode: "preprod",
} as const;

describe("runtime environment safety", () => {
  it.each(["localhost", "127.0.0.1"])(
    "allows local pre-production bypass on %s with local Supabase",
    (hostname) => {
      const environment = resolveRuntimeEnvironment({ ...safeBypass, hostname });
      expect(environment).toMatchObject({
        appEnvironment: "preprod-local",
        authMode: "bypass",
        isLocalPreprod: true,
        usesLocalSupabase: true,
      });
    },
  );

  it("rejects bypass when Supabase is not local", () => {
    expect(() => resolveRuntimeEnvironment({
      ...safeBypass,
      supabaseUrl: "https://production-project.supabase.co",
    })).toThrow(/local pre-production refused.*VITE_SUPABASE_URL/i);
  });

  it("rejects bypass on a non-local application hostname", () => {
    expect(() => resolveRuntimeEnvironment({
      ...safeBypass,
      hostname: "preview.demandlint.com",
    })).toThrow(/local pre-production refused.*hostname/i);
  });

  it("rejects bypass from a normal production build even with local endpoints", () => {
    expect(() => resolveRuntimeEnvironment({
      ...safeBypass,
      appEnvironment: "production",
      viteMode: "production",
    })).toThrow(/auth bypass refused/i);
  });

  it("rejects local pre-production with normal auth when Supabase is hosted", () => {
    expect(() => resolveRuntimeEnvironment({
      ...safeBypass,
      authMode: "supabase",
      supabaseUrl: "https://production-project.supabase.co",
    })).toThrow(/local pre-production refused/i);
  });

  it("leaves normal production authentication unchanged", () => {
    expect(resolveRuntimeEnvironment({
      appEnvironment: "production",
      authMode: "supabase",
      hostname: "demandlint.com",
      supabaseUrl: "https://production-project.supabase.co",
      viteMode: "production",
    })).toEqual({
      appEnvironment: "production",
      authMode: "supabase",
      isLocalPreprod: false,
      usesLocalSupabase: false,
    });
  });
});
