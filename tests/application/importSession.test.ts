import { describe, expect, it } from "vitest";
import type { ParsedTable } from "../../src/application/import/domain";
import {
  addImportSource,
  analyzeImportSource,
  createImportSession,
} from "../../src/application/import/session";

function table(fileName: string, email: string): ParsedTable {
  return {
    columns: ["First Name", "Last Name", "Email", "Company"],
    rows: [{
      "First Name": "Ada",
      "Last Name": "Lovelace",
      Email: email,
      Company: "Analytical Engines",
    }],
    metadata: {
      fileName,
      sourceType: "csv",
      rowCount: 1,
      columnCount: 4,
      headerRowNumber: 1,
      delimiter: ",",
    },
    warnings: [],
  };
}

describe("ImportSession", () => {
  it("keeps record identity unique when multiple files contain the same row number", () => {
    let session = createImportSession("session-1");
    session = addImportSource(session, "source:a", table("a.csv", "ada@a.example"));
    session = addImportSource(session, "source:b", table("b.csv", "ada@b.example"));
    session = analyzeImportSource(session, "source:a");
    session = analyzeImportSource(session, "source:b");

    const first = session.sources[0]?.result?.leads[0];
    const second = session.sources[1]?.result?.leads[0];

    expect(first?.sourceRow).toBe(2);
    expect(second?.sourceRow).toBe(2);
    expect(first?.recordId).toBe("source:a:2");
    expect(second?.recordId).toBe("source:b:2");
    expect(first?.recordId).not.toBe(second?.recordId);
    expect(first?.provenance.sourceName).toBe("a.csv");
    expect(second?.provenance.sourceName).toBe("b.csv");
  });

  it("rejects duplicate source identifiers inside one session", () => {
    const session = addImportSource(
      createImportSession("session-1"),
      "source:a",
      table("a.csv", "ada@a.example"),
    );

    expect(() => addImportSource(session, "source:a", table("b.csv", "ada@b.example")))
      .toThrow("already exists");
  });
});
