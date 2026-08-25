import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExportTemplatesPage, TemplateStructurePreview } from "../../src/components/ExportTemplatesPage";

describe("ExportTemplatesPage", () => {
  it("shows a clear empty state and creation action", () => {
    const html = renderToStaticMarkup(<ExportTemplatesPage templates={[]} organizationId="org-1" onSave={async (template) => template} onDelete={async () => undefined} />);

    expect(html).toContain("No export templates yet.");
    expect(html).toContain("Create template");
    expect(html).toContain("Import template");
    expect(html).toContain("CSV, XLS or XLSX");
    expect(html).toContain('accept=".csv,.xlsx,.xls');
  });

  it("exposes edit, duplicate, rename and delete actions for a workspace template", () => {
    const html = renderToStaticMarkup(<ExportTemplatesPage templates={[{ id: "template-1", organizationId: "org-1", name: "Events", destinationType: "CRM", defaultFormat: "csv", columns: [] }]} organizationId="org-1" onSave={async (template) => template} onDelete={async () => undefined} />);

    expect(html).toContain("Edit");
    expect(html).toContain("Duplicate");
    expect(html).toContain("Rename");
    expect(html).toContain("Delete");
  });

  it("uses a full-width template list heading", () => {
    const html = renderToStaticMarkup(<ExportTemplatesPage templates={[]} organizationId="org-1" onSave={async (template) => template} onDelete={async () => undefined} />);
    expect(html).toContain("YOUR TEMPLATES");
    expect(html).not.toContain("WORKSPACE TEMPLATES");
  });

  it("renders exact preview headers, source labels and the column count", () => {
    const html = renderToStaticMarkup(<TemplateStructurePreview template={{ id: "template-1", name: "Preview", destinationType: "", defaultFormat: "csv", columns: [
      { id: "email", header: "Email", source: { kind: "canonical", field: "email" } },
      { id: "custom", header: "Account owner", source: { kind: "custom", key: "owner" } },
      { id: "fixed", header: "Campaign", source: { kind: "parameter", key: "campaign", label: "Campaign" } },
      { id: "empty", header: "Reserved", source: { kind: "empty" } },
    ] }} />);

    expect(html).toMatch(/<th>Email<\/th><th>Account owner<\/th><th>Campaign<\/th><th>Reserved<\/th>/);
    expect(html).toMatch(/<td>Mapped field<\/td><td>Mapped field<\/td><td>Fixed field<\/td><td>Leave empty<\/td>/);
    expect(html).toContain("4 columns");
    expect(html).not.toContain("Constant");
  });
});
