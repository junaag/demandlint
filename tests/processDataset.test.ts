import { describe, expect, it } from "vitest";
import type { ColumnMapping, ProcessingConfig, RawRow } from "../src/core/domain";
import { processDataset } from "../src/core/processDataset";

const mapping: ColumnMapping = {
  "First Name": "firstName",
  "Last Name": "lastName",
  Email: "email",
  Company: "company",
  Country: "country",
};

const config: ProcessingConfig = {
  requiredFields: ["firstName", "lastName", "email", "company"],
  personalEmailPolicy: "warning",
};

describe("processDataset", () => {
  it("keeps a clean business lead ready for import", () => {
    const rows: RawRow[] = [{
      "First Name": "Ada",
      "Last Name": "Lovelace",
      Email: "ada@analytical.example",
      Company: "Analytical Engines",
      Country: "UK",
    }];

    const result = processDataset(rows, mapping, config);

    expect(result.stats.totalRows).toBe(1);
    expect(result.stats.readyRows).toBe(1);
    expect(result.stats.blockedRows).toBe(0);
    expect(result.ready[0]?.email).toBe("ada@analytical.example");
  });

  it("normalizes whitespace and email casing deterministically", () => {
    const rows: RawRow[] = [{
      "First Name": "  Grace  ",
      "Last Name": " Hopper ",
      Email: " GRACE@NAVY.EXAMPLE ",
      Company: "  US Navy  ",
    }];

    const result = processDataset(rows, mapping, config);

    expect(result.ready[0]).toMatchObject({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@navy.example",
      company: "US Navy",
    });
    expect(result.stats.normalizedValues).toBeGreaterThanOrEqual(4);
  });

  it("blocks a row when a required field is missing", () => {
    const rows: RawRow[] = [{
      "First Name": "Katherine",
      "Last Name": "Johnson",
      Email: "katherine@nasa.example",
      Company: "",
    }];

    const result = processDataset(rows, mapping, config);

    expect(result.stats.blockedRows).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "company", type: "missing", severity: "error" }),
    );
  });

  it("blocks invalid email syntax", () => {
    const rows: RawRow[] = [{
      "First Name": "Margaret",
      "Last Name": "Hamilton",
      Email: "margaret@",
      Company: "NASA",
    }];

    const result = processDataset(rows, mapping, config);

    expect(result.stats.blockedRows).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "email", type: "invalid", severity: "error" }),
    );
  });

  it("flags duplicate normalized emails for review", () => {
    const rows: RawRow[] = [
      {
        "First Name": "Jean",
        "Last Name": "Dupont",
        Email: "Jean@Example.com",
        Company: "Example",
      },
      {
        "First Name": "Jean",
        "Last Name": "Dupont",
        Email: " jean@example.com ",
        Company: "Example France",
      },
    ];

    const result = processDataset(rows, mapping, config);

    expect(result.stats.duplicateRows).toBe(1);
    expect(result.stats.uniqueContacts).toBe(1);
    expect(result.stats.readyRows).toBe(1);
    expect(result.stats.reviewRows).toBe(1);
  });

  it("flags personal email domains according to recipe policy", () => {
    const rows: RawRow[] = [{
      "First Name": "Marie",
      "Last Name": "Curie",
      Email: "marie@gmail.com",
      Company: "Radium Institute",
    }];

    const result = processDataset(rows, mapping, config);

    expect(result.stats.reviewRows).toBe(1);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ type: "warning", severity: "warning" }),
    );
  });
});
