import type { ReactNode } from "react";
import { Check, GlobalCta, Hero, SectionHeading } from "../shared";
import { ExcelModelVisual, ImportVisual, MappingVisual, PreviewExportVisual, StandardizationVisual, TemplateEditorVisual, ValidationVisual } from "../visuals";

export function ProductPage() {
  return <>
    <Hero eyebrow="PRODUCT" title="One workflow for cleaner, safer data imports." copy="DemandLint gives you the tools to transform inconsistent source files into predictable, validated datasets." />
    <ProductFeature id="features" eyebrow="IMPORT" title="Start with the files you already receive." copy="Work directly with CSV and Excel files from external providers, events, partners, internal teams or business applications. DemandLint helps identify the structure of your file so you can move quickly from raw data to a usable mapping." bullets={["CSV / XLSX / XLS support", "Multiple sheets", "Field detection", "Data-type detection", "Dropdown and allowed-value detection"]} visual={<ImportVisual />} />
    <ProductFeature reverse eyebrow="FIELD MAPPING" title="Different source. Same destination." copy="Source files rarely use the exact structure expected by your systems. Map incoming columns to your standard fields and create a predictable destination schema." visual={<MappingVisual />} />
    <ProductFeature eyebrow="STANDARDIZATION" title="Make inconsistent values consistent." copy="Transform source values into the formats expected by your destination systems." bullets={["Dates", "Countries", "Locations", "Phone numbers", "Statuses", "Text values", "Controlled lists"]} visual={<StandardizationVisual />} />
    <ProductFeature reverse eyebrow="VALIDATION" title="Catch problems before your destination system does." copy="Check your dataset before exporting it. DemandLint can identify missing required values, invalid allowed values, incompatible formats, empty fields and inconsistent mapped values." closing="The objective isn't just cleaner data. It's safer imports." visual={<ValidationVisual />} />
    <ProductFeature eyebrow="TEMPLATES" title="Turn your destination format into a reusable standard." copy="Save your configuration as a template. A DemandLint template can define target fields, mappings, allowed values, formats, required fields, empty-value handling, replacement rules and column order." closing="Teams can reuse the same standard instead of recreating spreadsheet logic every time." visual={<TemplateEditorVisual />} />
    <ProductFeature reverse eyebrow="EXCEL MODELS" title="Keep the file structure your destination already expects." copy="When a destination requires a specific Excel model, DemandLint can use that workbook structure as part of your export workflow. Prepare the data while keeping the expected destination format." visual={<ExcelModelVisual />} />
    <ProductFeature eyebrow="PREVIEW & EXPORT" title="Review before anything leaves DemandLint." copy="Preview transformed values and final columns before generating the output. When everything looks right, export the prepared dataset." visual={<PreviewExportVisual />} />
    <GlobalCta />
  </>;
}

function ProductFeature({ id, eyebrow, title, copy, bullets, closing, visual, reverse = false }: { id?: string; eyebrow: string; title: string; copy: string; bullets?: string[]; closing?: string; visual: ReactNode; reverse?: boolean }) {
  return <section className={`marketing-section product-feature ${reverse ? "reverse" : ""}`} id={id}><div className="marketing-container product-feature-grid"><div className="product-feature-copy"><SectionHeading eyebrow={eyebrow} title={title} copy={copy} />{bullets && <ul className="capability-list">{bullets.map(item => <li key={item}><Check /> {item}</li>)}</ul>}{closing && <h3>{closing}</h3>}</div><div className="product-visual-wrap">{visual}</div></div></section>;
}
