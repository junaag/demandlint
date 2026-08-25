import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createExportTemplateDraft } from "../../src/application/exportTemplates";
import { ExportTemplateEditor } from "../../src/components/ExportTemplateEditor";

describe("ExportTemplateEditor", () => {
  it("uses non-technical terminology and only shows spreadsheet options for Excel", () => {
    const html = renderToStaticMarkup(<ExportTemplateEditor template={createExportTemplateDraft()} onChange={() => undefined} />);

    expect(html).toContain("Column name");
    expect(html).toContain("Value Source");
    expect(html).toContain("Mapped field");
    expect(html).toContain("Fixed value");
    expect(html).toContain("Leave empty");
    expect(html).toContain("Source field");
    expect(html).toContain("If empty, use");
    expect(html).not.toContain("Worksheet name");
    expect(html).toContain("Optional rules");
    expect(html).toContain("Column order is exact. Leave empty keeps the column but leaves every cell blank.");
    expect(html).toContain("E.g. CRM, event platform or internal process.");
    expect(html).toContain("Choose where DemandLint should get the value for this column.");
    expect(html).toContain("Export is blocked if this final value is empty.");
    expect(html).toMatch(/class="column-order"><strong>1<\/strong><button[^>]*>↑<\/button><button[^>]*>↓<\/button><\/div>/);
    expect(html).toMatch(/<header class="export-column-card-header"><div class="column-order"><strong>1<\/strong><button[^>]*>↑<\/button><button[^>]*>↓<\/button><\/div><div class="column-card-actions"><button[^>]*>×<\/button><\/div><\/header>/);
    expect(html.indexOf('class="export-column-card-header"')).toBeLessThan(html.indexOf("Optional rules"));
  });

  it("shows the worksheet setting for XLSX and the fixed-value fields for a parameter column", () => {
    const template = createExportTemplateDraft({
      defaultFormat: "xlsx",
      columns: [{ id: "program", header: "Program", source: { kind: "parameter", key: "program", label: "Program" }, required: true }],
    });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);

    expect(html).toContain("Worksheet name");
    expect(html).toContain("Fixed value");
    expect(html).toContain("Required");
  });

  it("hides Required for an empty column while retaining its header actions", () => {
    const template = createExportTemplateDraft({
      columns: [{ id: "empty", header: "Reserved", source: { kind: "empty" } }],
    });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);

    expect(html).not.toContain("Export is blocked if this final value is empty.");
    expect(html).toMatch(/<header class="export-column-card-header"><div class="column-order"><strong>1<\/strong><button[^>]*>↑<\/button><button[^>]*>↓<\/button><\/div><div class="column-card-actions"><button[^>]*>×<\/button><\/div><\/header>/);
  });
});
