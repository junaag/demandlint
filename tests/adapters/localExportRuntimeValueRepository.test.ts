import { describe, expect, it } from "vitest";
import { LocalExportRuntimeValueRepository } from "../../src/adapters/browser/localExportRuntimeValueRepository";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("local export runtime value repository", () => {
  it("stores last-used values per template rather than globally", () => {
    const repository = new LocalExportRuntimeValueRepository(new MemoryStorage());
    repository.save("template-a", { campaign: "701-A" });
    repository.save("template-b", { campaign: "701-B" });

    expect(repository.read("template-a")).toEqual({ campaign: "701-A" });
    expect(repository.read("template-b")).toEqual({ campaign: "701-B" });
  });

  it("safely ignores unavailable or malformed browser storage", () => {
    const repository = new LocalExportRuntimeValueRepository({ getItem: () => "not json", setItem: () => undefined });
    expect(repository.read("template-a")).toEqual({});
  });
});
