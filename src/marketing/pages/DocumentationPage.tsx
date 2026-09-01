import type { ReactNode } from "react";
import { GlobalCta } from "../shared";

const DOC_NAV = [
  ["Getting started", ["What is DemandLint?", "Sign in", "Your workspace", "Import your first file", "Prepare your first export"]],
  ["Imports", ["Supported file formats", "CSV files", "Excel workbooks", "Multiple sheets", "Selecting a source sheet", "Detected fields", "Detected data types"]],
  ["Mapping", ["What is field mapping?", "Mapping a source field", "Fixed values", "Empty fields", "Changing a mapping"]],
  ["Templates", ["What is a template?", "Create a template", "Edit a template", "Duplicate a template", "Delete a template", "Import an Excel model", "Use a stored workbook", "Allowed values", "Date formats", "Empty-value handling", "Replacement rules"]],
  ["Preparing an export", ["Select a template", "Select source fields", "Review mappings", "Fill fixed values", "Resolve missing values", "Preview the result"]],
  ["Validation", ["Required fields", "Invalid values", "Allowed values", "Formatting errors", "Warnings versus blocking errors"]],
  ["Export", ["Preview", "CSV export", "Excel export", "Template-based Excel export"]],
  ["Workspace", ["Workspace overview", "Members", "Roles", "Invitations", "Shared templates"]],
  ["Security & data", ["How DemandLint processes imported data", "Data storage", "Authentication", "Workspace isolation", "File handling", "Account deletion"]],
  ["Troubleshooting", ["A field was not detected", "A dropdown was not detected", "The wrong field was automatically mapped", "An allowed value is missing", "A date format is incorrect", "The export is blocked", "My Excel template does not work as expected"]],
] as const;

const slug = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function DocumentationPage() {
  return <>
    <section className="docs-intro"><div className="marketing-container"><p className="docs-label">DOCUMENTATION</p><h1>DemandLint Documentation</h1><p>Learn how to import files, create mappings, configure templates, validate data and prepare exports.</p></div></section>
    <div className="marketing-container docs-layout">
      <aside className="docs-sidebar"><DocsNavigation /></aside>
      <details className="docs-mobile-nav"><summary>Browse documentation <span aria-hidden="true">⌄</span></summary><DocsNavigation /></details>
      <article className="docs-content">
        <section id="getting-started"><p className="docs-breadcrumb">Getting started</p><h2>Prepare your first export</h2><p>This guide covers the standard workflow from sign-in to a generated destination file. You can complete it manually or apply a reusable template.</p><GettingStartedSteps /></section>
        <DocsSection id="imports" title="Imports"><p>DemandLint accepts CSV, XLSX and XLS files. For Excel workbooks, available sheets are listed so you can confirm the source sheet before preparing data.</p><h3>Detected structure</h3><p>After import, DemandLint analyzes column headers, sample values and workbook validation rules. Detected fields and data types help accelerate mapping, but you should review the result before continuing.</p><Callout title="Multiple sheets">Select the sheet that contains the records you want to prepare. Reference or lookup sheets remain available for workbook analysis where supported.</Callout></DocsSection>
        <DocsSection id="mapping" title="Mapping"><p>Field mapping connects each source column to the field expected in the destination dataset. A mapping can use a source field, a fixed value or an intentionally empty value.</p><h3>Review automatic suggestions</h3><p>DemandLint may suggest a destination based on the source header. Confirm each suggestion, especially when a file uses internal abbreviations or organization-specific terms.</p></DocsSection>
        <DocsSection id="templates" title="Templates"><p>A template saves a destination structure and the rules used to produce it. Use templates for recurring imports that must follow the same fields, order and validation rules.</p><h3>What a template can contain</h3><ul><li>Destination fields and column order</li><li>Source mappings, fixed values and fallbacks</li><li>Required fields, formats and allowed values</li><li>Replacement rules and empty-value handling</li><li>An optional stored Excel workbook used as the export model</li></ul><Callout title="Stored workbooks">A workbook is retained only when you explicitly choose to keep it with the template. Review workspace access before sharing a workbook-backed template.</Callout></DocsSection>
        <DocsSection id="preparing-an-export" title="Preparing an export"><p>Select a template or create the export structure manually. Review mappings, provide any fixed values requested by the configuration and resolve missing required values.</p><p>The preview shows final destination columns and transformed sample values. Use it to confirm both structure and content before generating the file.</p></DocsSection>
        <DocsSection id="validation" title="Validation"><p>Validation checks the prepared dataset against the active configuration. Required fields, allowed values and formatting rules can produce warnings or blocking errors.</p><h3>Warnings and blocking errors</h3><p>Warnings identify values that deserve review but may still allow export. Blocking errors indicate that the configured destination requirements are not satisfied and must be resolved first.</p></DocsSection>
        <DocsSection id="export" title="Export"><p>Review the final preview, then generate CSV, Excel or template-based Excel output as configured. The downloaded file contains the destination columns in their defined order.</p><p>Keep the source and exported file according to your organization’s retention and access policies.</p></DocsSection>
        <DocsSection id="workspace" title="Workspace"><p>A workspace groups members, reusable templates and shared configuration. Roles determine who can manage members or workspace resources.</p><p>Invitations and shared templates are scoped to the relevant workspace. Confirm the active workspace before editing configuration or preparing an export.</p></DocsSection>
        <DocsSection id="security-and-data" title="Security & data"><p>Imported operational datasets are processed for preparation and export and are not designed to become a permanent operational-data repository in DemandLint.</p><p>DemandLint stores account, workspace and reusable configuration data needed to provide the service. A workbook can also be retained when a user explicitly stores it with a template.</p><Callout title="File handling">Review the preview before export and manage downloaded files under your organization’s security policy. Authentication and workspace isolation protect saved configuration; they do not replace your own file-handling controls.</Callout></DocsSection>
        <DocsSection id="troubleshooting" title="Troubleshooting"><h3>A field was not detected or was mapped incorrectly</h3><p>Confirm that the correct sheet and header row were selected, then change the mapping manually. Clear, unique column names improve detection.</p><h3>An allowed value or dropdown is missing</h3><p>Check the template’s controlled list or Excel model. Add the expected value to the template configuration when it is valid for the destination.</p><h3>The export is blocked</h3><p>Open the validation summary and resolve each blocking item. Common causes include missing required values, incompatible formats and values outside an allowed list.</p><h3>An Excel model does not work as expected</h3><p>Confirm the selected worksheet, header position and stored workbook settings. Re-import the model if its structure changed after the template was created.</p></DocsSection>
      </article>
    </div>
    <GlobalCta />
  </>;
}

function DocsNavigation() { return <nav aria-label="Documentation sections">{DOC_NAV.map(([category, items]) => { const id = slug(category); return <div className="docs-nav-group" key={category}><a className="docs-nav-category" href={`#${id}`}>{category}</a><ul>{items.map(item => <li key={item}><a href={`#${id}`}>{item}</a></li>)}</ul></div>; })}</nav>; }

function GettingStartedSteps() {
  const steps = [
    ["Sign in to DemandLint", "Open DemandLint and sign in using your professional email address or supported identity provider."],
    ["Import a file", "Go to the import workflow and select a supported CSV or Excel file. DemandLint analyzes the workbook and makes its available sheets and fields available for preparation."],
    ["Select your workflow", "You can prepare an export manually or use an existing template. Templates are recommended for recurring imports."],
    ["Review mappings", "Check which source columns are mapped to each destination field. Correct mappings when necessary."],
    ["Review rules and values", "Review field mappings, formats, allowed values, required values, empty-value rules and replacement rules applied by the export configuration."],
    ["Preview the output", "Before exporting, review the generated structure and sample values."],
    ["Export", "Once validation is complete, generate the destination file."],
  ];
  return <ol className="docs-steps">{steps.map(([title, copy], index) => <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>;
}
function DocsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) { return <section id={id}><h2>{title}</h2>{children}</section>; }
function Callout({ title, children }: { title: string; children: ReactNode }) { return <aside className="docs-callout"><strong>{title}</strong><p>{children}</p></aside>; }
