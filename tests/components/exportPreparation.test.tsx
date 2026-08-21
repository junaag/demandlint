import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExportPreparation } from "../../src/components/ExportPreparation";
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
});
