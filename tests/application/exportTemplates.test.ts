import { describe, expect, it } from "vitest";
import {
  buildTemplateExport,
  CANONICAL_FIELD_OPTIONS,
  cloneExportTemplate,
  createExportTemplateDraft,
  exportRuntimeColumns,
  normalizeExportTemplate,
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

  it("validates final values after fallback and replacements, with review outcomes separated from blocks", () => {
    const output = buildTemplateExport({
      ...template,
      columns: [
        { id: "country", header: "Country", source: { kind: "custom", key: "country" }, defaultValue: "United States", valueMappings: [{ from: "US", to: "United States" }], validationRules: [{ kind: "allowedValues", outcome: "block", values: ["United States"] }] },
        { id: "state", header: "State", source: { kind: "custom", key: "state" }, validationRules: [{ kind: "requiredWhen", outcome: "block", parentColumnId: "country", operator: "is", values: ["United States"] }, { kind: "dependentAllowedValues", outcome: "review", parentColumnId: "country", cases: { "United States": ["CA"] } }] },
      ],
    }, [{ ...lead, customFields: { country: "US", state: "NY" } }]);
    expect(output.rows[0]).toEqual({ column_0: "United States", column_1: "NY" });
    expect(output.issues).toEqual([{ columnId: "state", outcome: "review", message: "State is invalid for source row 7." }]);
  });

  it("blocks empty required output and detects required empty configurations", () => {
    const output = buildTemplateExport({
      ...template,
      columns: [
        { id: "required", header: "Required", source: { kind: "empty" }, validationRules: [{ kind: "required", outcome: "block" }] },
        { id: "conditional", header: "Conditional", source: { kind: "empty" }, validationRules: [{ kind: "requiredWhen", outcome: "block", parentColumnId: "parent", operator: "isOneOf", values: ["Yes"] }] },
        { id: "parent", header: "Parent", source: { kind: "fixed", value: "Yes" } },
      ],
    }, [lead]);
    expect(output.issues.some((issue) => issue.columnId === "required" && issue.outcome === "block")).toBe(true);
    expect(output.issues.some((issue) => issue.columnId === "conditional" && issue.outcome === "block")).toBe(true);
  });

  it("keeps pre-v0.3.8 required templates functional", () => {
    const { email: _email, ...withoutEmail } = lead;
    const output = buildTemplateExport({ ...template, columns: [{ id: "legacy", header: "Email", source: { kind: "canonical", field: "email" }, required: true }] }, [withoutEmail]);
    expect(output.issues.some((issue) => issue.outcome === "block")).toBe(true);
  });

  it("resolves a fixed field at runtime for every row without persisting it", () => {
    const fixed = { id: "channel", header: "Import Channel", source: { kind: "fixed" as const }, emptyValueHandling: { kind: "required" as const }, validationRules: [{ kind: "allowedValues" as const, outcome: "block" as const, values: ["Webinar", "Event"] }] };
    const output = buildTemplateExport({ ...template, columns: [fixed] }, [lead, { ...lead, recordId: "lead-2" }], { channel: "Webinar" });
    expect(output.rows).toEqual([{ column_0: "Webinar" }, { column_0: "Webinar" }]);
    expect(output.issues).toEqual([]);
    expect(exportRuntimeColumns({ ...template, columns: [fixed] }).map((column) => column.id)).toEqual(["channel"]);
    expect(normalizeExportTemplate({ ...template, columns: [{ ...fixed, source: { kind: "fixed", value: "Event" }, required: true }] }).columns[0]?.source).toEqual({ kind: "fixed" });
  });

  it("uses one empty-value policy before final allowed-value validation", () => {
    const column = { id: "status", header: "Status", source: { kind: "custom" as const, key: "status" }, emptyValueHandling: { kind: "replace" as const, value: "Unknown" }, validationRules: [{ kind: "allowedValues" as const, outcome: "block" as const, values: ["Unknown", "Active"] }] };
    expect(buildTemplateExport({ ...template, columns: [column] }, [{ ...lead, customFields: { status: "" } }]).rows[0]).toEqual({ column_0: "Unknown" });
    const invalid = buildTemplateExport({ ...template, columns: [{ ...column, emptyValueHandling: { kind: "replace" as const, value: "Invalid" } }] }, [{ ...lead, customFields: { status: "" } }]);
    expect(invalid.issues.some((issue) => issue.outcome === "block")).toBe(true);
  });

  it("keeps workflow-specific legacy identifiers compatible but out of canonical suggestions", () => {
    const current = CANONICAL_FIELD_OPTIONS.map((option) => option.value);
    expect(current).not.toContain("campaignId");
    expect(current).not.toContain("leadSource");
    expect(current).not.toContain("utmCampaign");
    expect(CANONICAL_FIELD_OPTIONS.find((option) => option.value === "marketingConsent")?.label).toBe("Contact Opt-in");
  });

  it("keeps dependent allowed-value links intact when saving a template as new", () => {
    const original = { ...template, columns: [
      { id: "country", header: "Country", source: { kind: "fixed" as const }, validationRules: [{ kind: "allowedValues" as const, outcome: "block" as const, values: ["US"] }] },
      { id: "state", header: "State", source: { kind: "fixed" as const }, validationRules: [{ kind: "dependentAllowedValues" as const, outcome: "block" as const, parentColumnId: "country", cases: { US: ["CA"] } }] },
    ] };
    const cloned = cloneExportTemplate(original);
    expect(cloned.columns[1]?.validationRules?.[0]).toMatchObject({ parentColumnId: cloned.columns[0]?.id });
  });
});
