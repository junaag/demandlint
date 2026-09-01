import type { ReactNode } from "react";
import { APP_URL, Check, GlobalCta, SectionHeading } from "../shared";
import { ArchitectureVisual, TemplateRulesVisual, WorkflowPreview } from "../visuals";

export function HomePage() {
  return <>
    <section className="marketing-hero"><div className="marketing-container marketing-hero-grid">
      <div className="marketing-hero-copy"><p className="marketing-kicker">DATA PREPARATION BEFORE IMPORT</p><h1>Clean data in.<br />Reliable data out.</h1><p className="marketing-lead">Turn messy spreadsheets into clean, standardized and import-ready data — without spending hours fixing files by hand.</p><p className="marketing-support">DemandLint helps teams prepare, validate and transform operational data before it enters the systems they rely on.</p><a className="marketing-button" href={APP_URL}>Open DemandLint <span aria-hidden="true">→</span></a><ul className="marketing-reassurance" aria-label="DemandLint benefits"><li><Check /> Faster preparation</li><li><Check /> Fewer import errors</li><li><Check /> Consistent data</li></ul></div>
      <WorkflowPreview />
    </div></section>

    <section className="marketing-section home-value"><div className="marketing-container"><SectionHeading title="Stop fixing the same data problems over and over." copy="DemandLint turns manual spreadsheet preparation into a simple, repeatable workflow." /><div className="benefit-columns">
      <Benefit number="01" title="Save hours of manual work">Import your file, apply reusable mappings and transformation rules, review the result and export.<br /><br />What used to require formulas, copy-paste and manual checks becomes a repeatable process.</Benefit>
      <Benefit number="02" title="Make every import more reliable">Standardize formats, validate required fields and catch inconsistent values before they reach your CRM or destination system.<br /><br />Reduce failed imports, inconsistent records and downstream corrections.</Benefit>
      <Benefit number="03" title="Keep control of your data">Your imported datasets are processed for preparation and export without becoming a permanent data repository in DemandLint.<br /><br />DemandLint stores the configuration needed to make workflows reusable — not your operational data database.</Benefit>
    </div></div></section>

    <section className="marketing-section tinted-section" id="how-it-works"><div className="marketing-container"><SectionHeading title="From raw file to ready-to-import data." align="center" /><ol className="process-steps">
      <ProcessStep number="1" title="Import">Upload your CSV or Excel file.</ProcessStep>
      <ProcessStep number="2" title="Map & standardize">Match source fields to the expected structure and apply transformation rules.</ProcessStep>
      <ProcessStep number="3" title="Validate">Detect missing, invalid or inconsistent values before export.</ProcessStep>
      <ProcessStep number="4" title="Export">Generate a structured file ready for the destination system.</ProcessStep>
    </ol><ArchitectureVisual /></div></section>

    <section className="marketing-section template-feature"><div className="marketing-container split-feature"><div><SectionHeading eyebrow="REUSABLE TEMPLATES" title="Define your rules once. Reuse them everywhere." copy="Create reusable templates that define how your data should look." /><h3>Less manual work. More consistency.</h3></div><TemplateRulesVisual /></div></section>
    <TrustStrip />
    <GlobalCta />
  </>;
}

function Benefit({ number, title, children }: { number: string; title: string; children: ReactNode }) { return <article className="benefit"><span>{number}</span><h3>{title}</h3><p>{children}</p></article>; }
function ProcessStep({ number, title, children }: { number: string; title: string; children: ReactNode }) { return <li><span>{number}</span><div><h3>{title}</h3><p>{children}</p></div></li>; }
function TrustStrip() { return <section className="trust-strip"><div className="marketing-container"><h2>Your data workflow, without another data silo.</h2><ul><li><Check /> No permanent storage of imported operational datasets</li><li><Check /> Controlled transformations</li><li><Check /> Preview before export</li><li><Check /> Reusable standards for your team</li></ul></div></section>; }
