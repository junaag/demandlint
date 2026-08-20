import { describe, expect, it } from "vitest";
import type { ParsedTable } from "../../src/application/import/domain";
import {
  analyzeParsedTable,
  validateMapping,
} from "../../src/application/analyzeParsedTable";
import type { ColumnMapping } from "../../src/core/domain";

const table: ParsedTable = {
  columns: ["Nombre", "Apellidos", "Empresa", "Correo electrónico", "Cargo"],
  rows: [
    {
      Nombre: "Ana",
      Apellidos: "Silva",
      Empresa: "Acme",
      "Correo electrónico": "ANA@ACME.COM",
      Cargo: "CMO",
    },
    {
      Nombre: "Luis",
      Apellidos: "Costa",
      Empresa: "Contoso",
      "Correo electrónico": "luis@gmail.com",
      Cargo: "Director de Marketing",
    },
  ],
  metadata: {
    fileName: "iberia-leads.csv",
    sourceType: "csv",
    rowCount: 2,
    columnCount: 5,
    headerRowNumber: 1,
    delimiter: ",",
  },
  warnings: [],
};

const validMapping: ColumnMapping = {
  Nombre: "firstName",
  Apellidos: "lastName",
  Empresa: "company",
  "Correo electrónico": "email",
  Cargo: "jobTitle",
};

describe("application analysis bridge", () => {
  it("accepts a complete unique mapping", () => {
    expect(validateMapping(table, validMapping)).toEqual({
      valid: true,
      errors: [],
      missingRequiredFields: [],
      duplicateTargetFields: [],
    });
  });

  it("rejects a mapping missing required CRM import fields", () => {
    const mapping: ColumnMapping = {
      ...validMapping,
      Empresa: "ignore",
    };

    const validation = validateMapping(table, mapping);
    expect(validation.valid).toBe(false);
    expect(validation.missingRequiredFields).toEqual(["company"]);
  });

  it("accepts any typed email role as the required primary-email source", () => {
    const mapping: ColumnMapping = {
      ...validMapping,
      "Correo electrónico": "emailProfessional",
    };

    expect(validateMapping(table, mapping).valid).toBe(true);
  });

  it("rejects multiple source columns mapped to the same target", () => {
    const mapping: ColumnMapping = {
      ...validMapping,
      Cargo: "company",
    };

    const validation = validateMapping(table, mapping);
    expect(validation.valid).toBe(false);
    expect(validation.duplicateTargetFields).toEqual(["company"]);
  });

  it("runs the Clean Core with stable source provenance", () => {
    const result = analyzeParsedTable(table, validMapping, "source:iberia");

    expect(result.stats.totalRows).toBe(2);
    expect(result.stats.readyRows).toBe(1);
    expect(result.stats.reviewRows).toBe(1);
    expect(result.stats.blockedRows).toBe(0);
    expect(result.leads[0]).toMatchObject({
      email: "ana@acme.com",
      recordId: "source:iberia:2",
      provenance: {
        sourceId: "source:iberia",
        sourceName: "iberia-leads.csv",
        rowNumber: 2,
      },
    });
  });
});
