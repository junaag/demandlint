import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExportMethodChoice, ExportPreparation } from "../../src/components/ExportPreparation";
import { createExportTemplateDraft } from "../../src/application/exportTemplates";
import { processDataset } from "../../src/core/processDataset";

const result = processDataset(
  [{ Email: "alice@example.com", Company: "Acme" }],
  { Email: "email", Company: "company" },
  { requiredFields: ["email"], personalEmailPolicy: "warning" },
  { id: "source-1", name: "leads.csv" },
);

describe("ExportPreparation", () => {
  it("shows the mode choice first and enters the custom configuration path by default", () => {
    const html = renderToStaticMarkup(
      <ExportPreparation
        result={result}
        templates={[]}
        organizationId="org-1"
        onSave={async (template) => template}
      />,
    );

    expect(html).toContain("Custom export");
    expect(html).toContain("Use a template");
    expect(html).toContain("Included output columns");
    expect(html).not.toContain("Destination template");
  });

  it("explains both export methods for an attached workbook", () => {
    const template = createExportTemplateDraft({ workbook: {
      storagePath: "org/template/master.xlsx", originalFileName: "Marketo_bulk_import.xlsx", originalFileType: "xlsx",
      storedFileType: "xlsx", targetSheet: "Import", headerRow: 2, firstDataRow: 3,
    } });
    const html = renderToStaticMarkup(<ExportMethodChoice template={template} method="generate" onChange={() => undefined} />);
    expect(html).toContain("2. EXPORT METHOD");
    expect(html).toContain("Generate new file");
    expect(html).toContain("Fill template workbook");
    expect(html).toContain("Marketo_bulk_import.xlsx");
    expect(html).toContain("preserving its existing workbook structure");
  });
});
