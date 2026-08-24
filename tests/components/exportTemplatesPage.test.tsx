import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExportTemplatesPage } from "../../src/components/ExportTemplatesPage";

describe("ExportTemplatesPage", () => {
  it("shows a clear empty state and creation action", () => {
    const html = renderToStaticMarkup(<ExportTemplatesPage templates={[]} organizationId="org-1" onSave={async (template) => template} onDelete={async () => undefined} />);

    expect(html).toContain("No export templates yet.");
    expect(html).toContain("Create template");
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
});
