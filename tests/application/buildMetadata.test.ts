import { describe, expect, it } from "vitest";
import { createBuildMetadata } from "../../src/application/buildMetadataFactory";

describe("build metadata", () => {
  it("uses the package version and injected commit, with a local fallback", () => {
    expect(createBuildMetadata("0.3.2", "abc123def")).toEqual({ version: "0.3.2", gitCommitSha: "abc123def" });
    expect(createBuildMetadata("0.3.2").gitCommitSha).toBe("local");
  });
});
