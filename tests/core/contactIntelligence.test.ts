import { describe, expect, it } from "vitest";
import type { ColumnMapping, ProcessingConfig, RawRow } from "../../src/core/domain";
import { buildCleanExportRows } from "../../src/application/qualityReview";
import { normalizePhone } from "../../src/core/phoneNormalization";
import { processDataset } from "../../src/core/processDataset";

const mapping: ColumnMapping = {
  First: "firstName",
  Last: "lastName",
  Company: "company",
  Country: "country",
  "Work Email": "emailProfessional",
  "Backup Email": "emailSecondary",
  Mobile: "phoneMobile",
  Direct: "phoneDirect",
  Standard: "phoneStandard",
};

const config: ProcessingConfig = {
  requiredFields: ["firstName", "lastName", "email", "company"],
  personalEmailPolicy: "warning",
};

function row(overrides: Partial<RawRow> = {}): RawRow {
  return {
    First: "Ada",
    Last: "Lovelace",
    Company: "Analytical Engines",
    Country: "France",
    "Work Email": " ADA@WORK.EXAMPLE ",
    "Backup Email": "ada.secondary@example.net",
    Mobile: "06 40 11 25 43",
    Direct: 149036892,
    Standard: "01 49 03 68 00",
    ...overrides,
  };
}

describe("contact intelligence", () => {
  it("keeps every typed contact value and selects the configured defaults", () => {
    const result = processDataset([row()], mapping, config);
    const lead = result.leads[0];

    expect(lead).toMatchObject({
      email: "ada@work.example",
      emailProfessional: "ada@work.example",
      emailSecondary: "ada.secondary@example.net",
      phone: "+33640112543",
      phoneMobile: "+33640112543",
      phoneDirect: "+33149036892",
      phoneStandard: "+33149036800",
    });
    expect(lead?.emails).toHaveLength(2);
    expect(lead?.phones).toHaveLength(3);
  });

  it("falls back to a valid secondary email and direct phone", () => {
    const result = processDataset([
      row({
        "Work Email": "not-an-email",
        Mobile: "",
      }),
    ], mapping, config);
    const lead = result.leads[0];

    expect(lead?.email).toBe("ada.secondary@example.net");
    expect(lead?.phone).toBe("+33149036892");
    expect(result.review).toHaveLength(1);
    expect(result.blocked).toHaveLength(0);
    expect(result.issues).toContainEqual(expect.objectContaining({
      field: "emailProfessional",
      severity: "warning",
    }));
  });

  it("honors user-defined priority without discarding alternatives", () => {
    const result = processDataset([row()], mapping, {
      ...config,
      contactPreferences: {
        emailPriority: ["secondary", "professional", "personal", "other"],
        phonePriority: ["standard", "direct", "mobile", "other"],
      },
    });
    const lead = result.leads[0];

    expect(lead?.email).toBe("ada.secondary@example.net");
    expect(lead?.phone).toBe("+33149036800");
    expect(lead?.emails).toHaveLength(2);
    expect(lead?.phones).toHaveLength(3);
  });

  it("deduplicates identical normalized values while keeping source columns", () => {
    const result = processDataset([
      row({
        "Backup Email": "ADA@WORK.EXAMPLE",
        Direct: "06 40 11 25 43",
      }),
    ], mapping, config);
    const lead = result.leads[0];

    expect(lead?.emails).toHaveLength(1);
    expect(lead?.emails?.[0]?.sourceColumns).toEqual(["Work Email", "Backup Email"]);
    expect(lead?.phones).toHaveLength(2);
    expect(lead?.phones?.find((phone) => phone.e164 === "+33640112543")?.sourceColumns)
      .toEqual(["Mobile", "Direct"]);
  });

  it("exposes primary and typed contact values to CSV shaping", () => {
    const result = processDataset([row()], mapping, config);

    expect(buildCleanExportRows(result)[0]).toMatchObject({
      email: "ada@work.example",
      emailProfessional: "ada@work.example",
      emailSecondary: "ada.secondary@example.net",
      phone: "+33640112543",
      phoneMobile: "+33640112543",
      phoneDirect: "+33149036892",
      phoneStandard: "+33149036800",
    });
  });
});

describe("E.164 phone normalization", () => {
  it("normalizes French national, numeric Excel and international formats", () => {
    expect(normalizePhone("06 40 11 25 43", "France")?.e164).toBe("+33640112543");
    expect(normalizePhone(149036892, "FR")?.e164).toBe("+33149036892");
    expect(normalizePhone("0033 6 40 11 25 43", undefined)?.e164).toBe("+33640112543");
  });

  it("keeps extensions separate from the E.164 value", () => {
    expect(normalizePhone("01 49 03 68 00 poste 42", "France")).toMatchObject({
      e164: "+33149036800",
      extension: "42",
      validity: "valid",
    });
  });

  it("marks unsupported country-dependent values as ambiguous", () => {
    expect(normalizePhone("0123456789", "Japan", "ZZ")).toMatchObject({
      validity: "ambiguous",
    });
  });

  it("treats spreadsheet empty tokens as missing values", () => {
    expect(normalizePhone("N/A", "France")).toBeUndefined();
  });
});
