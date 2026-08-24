import { describe, expect, it } from "vitest";
import {
  buildTemplateExport,
  cloneExportTemplate,
  createExportTemplateDraft,
  type ExportTemplate,
} from "../../src/application/exportTemplates";
import type { CanonicalLead } from "../../src/core/domain";

const lead: CanonicalLead = {
  recordId: "lead-1",
  provenance: { sourceId: "source-1", sourceName: "leads.xls", rowNumber: 7 },
  sourceRow: 7,
  firstName: "Alice",
  lastName: "Martin",
  email: "alice@example.com",
  leadSource: "EVENT",
  customFields: { eventDate: "2026-08-21", score: "42" },
};

const template: ExportTemplate = {
  id: "template-1",
  name: "Marketo campaign",
  destinationType: "Marketo",
  defaultFormat: "xlsx",
  columns: [
    { id: "1", header: "Email Address", source: { kind: "canonical", field: "email" }, required: true },
    { id: "2", header: "Program Name", source: { kind: "parameter", key: "program", label: "Program" }, required: true },
    { id: "3", header: "Member Status", source: { kind: "parameter", key: "status", label: "Status", defaultValue: "Member" } },
    { id: "4", header: "Reserved", source: { kind: "empty" } },
    { id: "5", header: "Lead Source", source: { kind: "canonical", field: "leadSource" }, valueMappings: [{ from: "EVENT", to: "Event" }] },
    { id: "6", header: "Score", source: { kind: "custom", key: "score" }, format: "number" },
  ],
};

describe("destination export templates", () => {
  it("builds exact ordered columns with fixed values, blanks and mappings", () => {
    const output = buildTemplateExport(template, [lead], { program: "FY27 Roadshow" });

    expect(output.issues).toEqual([]);
    expect(output.columns.map((column) => column.header)).toEqual([
      "Email Address", "Program Name", "Member Status", "Reserved", "Lead Source", "Score",
    ]);
    expect(output.rows[0]).toEqual({
      column_0: "alice@example.com",
      column_1: "FY27 Roadshow",
      column_2: "Member",
      column_3: "",
      column_4: "Event",
      column_5: 42,
    });
  });

  it("reports missing prompts and required row values before export", () => {
    const { email: _email, ...leadWithoutEmail } = lead;
    const output = buildTemplateExport(template, [leadWithoutEmail], {});
    expect(output.issues.map((issue) => issue.message)).toContain("Enter Program.");
    expect(output.issues.some((issue) => issue.message.includes("source row 7"))).toBe(true);
  });

  it("rejects duplicate output headers", () => {
    const output = buildTemplateExport({
      ...template,
      columns: [template.columns[0]!, { ...template.columns[1]!, header: "email address" }],
    }, [lead], { program: "Test" });
    expect(output.issues.some((issue) => issue.message.includes("duplicated"))).toBe(true);
  });

  it("applies an explicit CRM date pattern", () => {
    const output = buildTemplateExport({
      ...template,
      columns: [{
        id: "date",
        header: "Event Date",
        source: { kind: "custom", key: "eventDate" },
        format: "date",
        datePattern: "MM/dd/yyyy",
      }],
    }, [lead]);
    expect(output.rows[0]).toEqual({ column_0: "08/21/2026" });
  });

  it("creates independent manual templates while preserving exact column order", () => {
    const manual = createExportTemplateDraft({ name: "My CRM import" });
    const duplicate = cloneExportTemplate(manual, { id: "duplicate", name: "My CRM import copy" });

    expect(manual.columns.map((column) => column.header)).toEqual(["Email", "First name", "Last name"]);
    expect(manual.columns.map((column) => column.source)).toEqual([
      { kind: "canonical", field: "emailProfessional" },
      { kind: "canonical", field: "firstName" },
      { kind: "canonical", field: "lastName" },
    ]);
    expect(manual.columns.every((column) => column.format === "text" && !column.required)).toBe(true);
    expect(duplicate.columns.map((column) => column.header)).toEqual(["Email", "First name", "Last name"]);
    expect(duplicate.columns[0]?.id).not.toBe(manual.columns[0]?.id);
  });
});
