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
  });

  it("keeps empty columns free of contradictory empty-value controls", () => {
    const template = createExportTemplateDraft({ columns: [{ id: "empty", header: "Reserved", source: { kind: "empty" } }] });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);
    expect(html).not.toContain("Empty value handling");
    expect(html).toMatch(/class="column-order"><strong>1<\/strong><button[^>]*>↑<\/button><button[^>]*>↓<\/button><\/div>/);
  });
});
