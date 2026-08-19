import { describe, expect, it } from "vitest";
import {
  buildCleanExportRows,
  buildQualityReview,
  buildReviewExportRows,
  countIssueTypes,
  filterQualityRows,
} from "../../src/application/qualityReview";
import type { ColumnMapping, RawRow } from "../../src/core/domain";
import { processDataset } from "../../src/core/processDataset";

const mapping: ColumnMapping = {
  "First Name": "firstName",
  "Last Name": "lastName",
  Email: "email",
  Company: "company",
};

const rows: RawRow[] = [
  {
    "First Name": " Ana ",
    "Last Name": "Silva",
    Email: "ANA@ACME.COM",
    Company: "Acme",
  },
  {
    "First Name": "Ana Duplicate",
    "Last Name": "Silva",
    Email: "ana@acme.com",
    Company: "Acme",
  },
  {
    "First Name": "No",
    "Last Name": "Email",
    Email: "",
    Company: "Acme",
  },
];

function result() {
  return processDataset(rows, mapping, {
    requiredFields: ["firstName", "lastName", "email", "company"],
    personalEmailPolicy: "warning",
  });
}

describe("quality review", () => {
  it("keeps ready, review and blocked rows explainable", () => {
    const processed = result();
    const review = buildQualityReview(processed);

    expect(review.map((row) => row.status)).toEqual(["ready", "review", "blocked"]);
    expect(review[0]?.issues.some((issue) => issue.type === "normalization")).toBe(true);
    expect(review[1]?.issues.some((issue) => issue.type === "duplicate")).toBe(true);
    expect(review[2]?.issues.some((issue) => issue.type === "missing")).toBe(true);
  });

  it("counts and filters issue types without changing row status", () => {
    const review = buildQualityReview(result());
    const counts = countIssueTypes(review);

    expect(counts.duplicate).toBe(1);
    expect(counts.missing).toBeGreaterThanOrEqual(1);
    expect(counts.normalization).toBeGreaterThanOrEqual(1);
    expect(filterQualityRows(review, "review", "duplicate")).toHaveLength(1);
    expect(filterQualityRows(review, "blocked", "all")).toHaveLength(1);
  });

  it("exports only ready rows to clean.csv shaping", () => {
    const clean = buildCleanExportRows(result());

    expect(clean).toHaveLength(1);
    expect(clean[0]).toMatchObject({
      firstName: "Ana",
      lastName: "Silva",
      email: "ana@acme.com",
      company: "Acme",
    });
  });

  it("preserves duplicate and blocked rows in review export with evidence", () => {
    const review = buildReviewExportRows(result());

    expect(review).toHaveLength(2);
    expect(review[0]).toMatchObject({
      email: "ana@acme.com",
      _quality_status: "review",
      _source_row: "3",
    });
    expect(review[0]?._quality_issue.toLowerCase()).toContain("duplicate");

    expect(review[1]).toMatchObject({
      email: "",
      _quality_status: "blocked",
      _source_row: "4",
    });
    expect(review[1]?._quality_issue.toLowerCase()).toContain("email");
  });
});
