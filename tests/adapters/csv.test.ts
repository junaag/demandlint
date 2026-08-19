import { describe, expect, it } from "vitest";
import { parseCsvBytes, parseCsvText } from "../../src/adapters/csv/parseCsv";
import { TableParseError } from "../../src/adapters/table/domain";

describe("CSV ingestion adapter", () => {
  it("parses a standard event lead CSV and preserves source headers", () => {
    const csv = [
      "Firstname,Surname,Organisation,Business Email",
      'Alice,Martin,"ACME, France",Alice.Martin@ACME.COM',
      "Bob,Durand,Contoso,bob@contoso.com",
    ].join("\n");

    const result = parseCsvText(csv, "event-leads.csv");

    expect(result.columns).toEqual(["Firstname", "Surname", "Organisation", "Business Email"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.Organisation).toBe("ACME, France");
    expect(result.rows[0]?.["Business Email"]).toBe("Alice.Martin@ACME.COM");
    expect(result.metadata).toMatchObject({
      fileName: "event-leads.csv",
      sourceType: "csv",
      rowCount: 2,
      columnCount: 4,
      delimiter: ",",
    });
  });

  it("auto-detects semicolon-delimited CSV files", () => {
    const csv = "Prénom;Nom;Société;Email\nAlice;Martin;ACME;alice@acme.com";
    const result = parseCsvText(csv, "france-event.csv");

    expect(result.metadata.delimiter).toBe(";");
    expect(result.columns).toEqual(["Prénom", "Nom", "Société", "Email"]);
    expect(result.rows).toHaveLength(1);
  });

  it("parses UTF-8 bytes and strips a BOM", () => {
    const bytes = new TextEncoder().encode("\uFEFFFirst Name,Email\nAlice,alice@example.com");
    const result = parseCsvBytes(bytes);

    expect(result.columns).toEqual(["First Name", "Email"]);
    expect(result.rows[0]?.["First Name"]).toBe("Alice");
  });

  it("rejects empty files with a stable error code", () => {
    expect(() => parseCsvText("   ")).toThrowError(TableParseError);

    try {
      parseCsvText("   ");
    } catch (error) {
      expect(error).toBeInstanceOf(TableParseError);
      expect((error as TableParseError).code).toBe("EMPTY_FILE");
    }
  });
});
