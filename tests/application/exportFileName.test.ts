import { describe, expect, it } from "vitest";
import {
  buildExportFileName,
  formatExportTimestamp,
} from "../../src/application/exportFileName";

describe("export file names", () => {
  it("uses the local export date down to the minute", () => {
    const exportedAt = new Date(2026, 7, 21, 12, 14, 59);

    expect(formatExportTimestamp(exportedAt)).toBe("202608211214");
    expect(buildExportFileName("clean", "csv", exportedAt)).toBe("clean-202608211214.csv");
    expect(buildExportFileName("review", "xlsx", exportedAt)).toBe("review-202608211214.xlsx");
  });

  it("pads midnight hours and minutes", () => {
    const exportedAt = new Date(2026, 7, 21, 0, 4);
    expect(buildExportFileName("clean", "xlsx", exportedAt)).toBe("clean-202608210004.xlsx");
  });
});
