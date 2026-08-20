import { describe, expect, it } from "vitest";
import {
  evaluateLeadTableColumns,
  selectBestWorkbookSheetIndex,
} from "../../src/application/import/selectWorkbookSheet";

describe("workbook sheet selection", () => {
  it("recognizes the required fields in French lead headers", () => {
    const evidence = evaluateLeadTableColumns([
      "Société",
      "Prénom",
      "Nom",
      "Fonction",
      "Mobile",
      "Email",
    ]);

    expect(evidence.requiredFieldCount).toBe(4);
    expect(evidence.recognizedFieldCount).toBeGreaterThanOrEqual(6);
  });

  it("prioritizes lead-field evidence ahead of raw worksheet size", () => {
    const selected = selectBestWorkbookSheetIndex([
      {
        index: 0,
        rowCount: 347,
        columnCount: 15,
        recognizedFieldCount: 0,
        requiredFieldCount: 0,
        mappingScore: 0,
      },
      {
        index: 1,
        rowCount: 160,
        columnCount: 16,
        recognizedFieldCount: 6,
        requiredFieldCount: 4,
        mappingScore: 30,
      },
    ]);

    expect(selected).toBe(1);
  });
});
