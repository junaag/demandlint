import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createExportTemplateDraft } from "../../src/application/exportTemplates";
import { ExportTemplateEditor } from "../../src/components/ExportTemplateEditor";

describe("ExportTemplateEditor", () => {
  it("uses non-technical terminology and only shows spreadsheet options for Excel", () => {
    const html = renderToStaticMarkup(<ExportTemplateEditor template={createExportTemplateDraft()} onChange={() => undefined} />);

    expect(html).toContain("Column name");
    expect(html).toContain("Value comes from");
    expect(html).toContain("Default field");
    expect(html).toContain("Custom field");
    expect(html).toContain("Fixed value");
    expect(html).toContain("Leave empty");
    expect(html).not.toContain("Worksheet name");
    expect(html).toContain("Optional rules");
    expect(html).toContain("E.g. CRM, event platform or internal process.");
    expect(html).toContain("Choose where DemandLint should get the value for this column.");
    expect(html).toContain("Export is blocked if this column has no value after applying defaults.");
    expect(html).toMatch(/class="column-order"><strong>1<\/strong><button[^>]*>↑<\/button><button[^>]*>↓<\/button><\/div>/);
    expect(html).toMatch(/class="column-card-actions"><button[^>]*>×<\/button><\/div>/);
    expect(html.indexOf('class="column-card-actions"')).toBeLessThan(html.indexOf("Optional rules"));
  });

  it("shows the worksheet setting for XLSX and the fixed-value fields for a parameter column", () => {
    const template = createExportTemplateDraft({
      defaultFormat: "xlsx",
      columns: [{ id: "program", header: "Program", source: { kind: "parameter", key: "program", label: "Program" }, required: true }],
    });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);

    expect(html).toContain("Worksheet name");
    expect(html).toContain("Value requested at export");
    expect(html).toContain("Default value (optional)");
    expect(html).toContain("Required for export");
  });

  it("hides Required for an empty column while retaining its header actions", () => {
    const template = createExportTemplateDraft({
      columns: [{ id: "empty", header: "Reserved", source: { kind: "empty" } }],
    });
    const html = renderToStaticMarkup(<ExportTemplateEditor template={template} onChange={() => undefined} />);

    expect(html).not.toContain("Required for export");
    expect(html).toMatch(/class="column-order"><strong>1<\/strong><button[^>]*>↑<\/button><button[^>]*>↓<\/button><\/div>/);
    expect(html).toMatch(/class="column-card-actions"><button[^>]*>×<\/button><\/div>/);
  });
});
