import { describe, expect, it } from "vitest";
import { serializeCsv } from "../../src/adapters/export/serializeCsv";

describe("serializeCsv", () => {
  it("preserves requested column order and utf-8 text", () => {
    const csv = serializeCsv(
      [{ key: "name" }, { key: "company" }],
      [{ name: "João", company: "Empresa" }],
    );

    expect(csv).toBe("name,company\r\nJoão,Empresa");
  });

  it("escapes commas, quotes and new lines", () => {
    const csv = serializeCsv(
      [{ key: "name" }, { key: "note" }],
      [{ name: 'Ana, "A"', note: "Line 1\nLine 2" }],
    );

    expect(csv).toBe('name,note\r\n"Ana, ""A""","Line 1\nLine 2"');
  });

  it("keeps empty values as empty cells", () => {
    const csv = serializeCsv(
      [{ key: "email" }, { key: "company" }],
      [{ email: undefined, company: null }],
    );

    expect(csv).toBe("email,company\r\n,");
  });
});
