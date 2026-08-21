import { describe, expect, it } from "vitest";
import { serializeCsv, serializeDelimited } from "../../src/adapters/export/serializeCsv";

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

describe("configurable delimited exports", () => {
  it("supports semicolon CSV and TSV while escaping the active delimiter", () => {
    const columns = [{ key: "name" }, { key: "note" }];
    expect(serializeDelimited(columns, [{ name: "Alice", note: "one;two" }], ";"))
      .toBe('name;note\r\nAlice;"one;two"');
    expect(serializeDelimited(columns, [{ name: "Alice", note: "one\ttwo" }], "\t"))
      .toBe('name\tnote\r\nAlice\t"one\ttwo"');
  });
});
