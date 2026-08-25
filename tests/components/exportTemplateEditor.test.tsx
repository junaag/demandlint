import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createExportTemplateDraft } from "../../src/application/exportTemplates";
import { ExportTemplateEditor } from "../../src/components/ExportTemplateEditor";

describe("ExportTemplateEditor", () => {
  it("uses the generic column-source terminology and one empty-value policy", () => {
    const html = renderToStaticMarkup(<ExportTemplateEditor template={createExportTemplateDraft()} onChange={() => undefined} />);
    expect(html).toContain("Column name");
    expect(html).toContain("Column source");
    expect(html).toContain("Mapped field");
    expect(html).toContain("Fixed field");
    expect(html).toContain("Leave empty");
    expect(html).not.toContain("Value Source");
    expect(html).not.toContain("Fixed value");
    expect(html).toContain("Source field");
    expect(html).toContain("Empty value handling");
    expect(html).toContain("Value required");
    expect(html).toContain("Replace empty value with…");
    expect(html).toContain("If value is empty, leave blank");
    expect(html).toContain("Replace values");
    expect(html).not.toContain("Worksheet name");
  });

  it("shows an allowed-values reference without a fixed-value input during design", () => {
    const template = createExportTemplateDraft({ defaultFormat: "xlsx", columns: [{ id: "channel", header: "Channel", source: { kind: "fixed" }, validationRules: [{ kind: "allowedValues", outcome: "block", values: ["Webinar", "Event"] }] }] });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);
    expect(html).toContain("Worksheet name");
    expect(html).toContain("Allowed values · 2 values");
    expect(html).not.toContain("Fixed value");
    expect(html).not.toContain("Replace values");
    expect(html).toContain('class="allowed-value-chips"');
  });

  it("shows concrete date and date-time examples that match export output", () => {
    const template = createExportTemplateDraft({ columns: [
      { id: "date", header: "Date", source: { kind: "fixed" }, format: "date" },
      { id: "datetime", header: "Timestamp", source: { kind: "fixed" }, format: "datetime" },
    ] });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);
    expect(html).toContain("MM/DD/YYYY — 08/26/2026");
    expect(html).toContain("MM/DD/YY HH:MM — 08/26/26 14:30");
    expect(html).toContain("ISO 8601 UTC — 2026-08-26T14:30:00Z");
  });

  it("shows a source-field menu without selecting a fallback for newly mapped columns", () => {
    const template = createExportTemplateDraft({ columns: [{ id: "gdpr", header: "GDPR Opt-in", source: { kind: "custom", key: "" } }] });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);
    expect(html).toContain("Select a source field…");
    expect(html).toContain("Other imported field name");
    expect(html).toContain("Contact Opt-in");
  });

  it("keeps empty columns free of contradictory empty-value controls", () => {
    const template = createExportTemplateDraft({ columns: [{ id: "empty", header: "Reserved", source: { kind: "empty" } }] });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);
    expect(html).not.toContain("Empty value handling");
    expect(html).toMatch(/class="column-order"><strong>1<\/strong><button[^>]*>↑<\/button><button[^>]*>↓<\/button><\/div>/);
  });
});
