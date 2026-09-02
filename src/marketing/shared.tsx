import type { ReactNode } from "react";
import { DemandLintLogo } from "../components/DemandLintLogo";
import type { PublicSiteRoute } from "./publicSiteRouting";

export const APP_URL = "https://app.demandlint.com";

export function MarketingHeader({ route }: { route: PublicSiteRoute }) {
  const nav = <>
    <a className={route === "product" ? "active" : ""} href="/product">Product</a>
    <a className={route === "solutions" ? "active" : ""} href="/solutions">Solutions</a>
    <a className={route === "documentation" ? "active" : ""} href="/documentation">Documentation</a>
  </>;
  return <header className="marketing-header"><div className="marketing-container marketing-header-inner">
    <Brand />
    <nav className="marketing-nav" aria-label="Primary navigation">{nav}</nav>
    <div className="marketing-header-actions">
      <a className="marketing-button marketing-button-small" href={APP_URL}>Open DemandLint <span aria-hidden="true">→</span></a>
      <details className="marketing-mobile-menu"><summary aria-label="Open navigation"><span /><span /><span /></summary><nav aria-label="Mobile navigation">{nav}</nav></details>
    </div>
  </div></header>;
}

export function Brand() { return <a className="marketing-brand" href="/" aria-label="DemandLint home"><DemandLintLogo width={41} /><strong>DemandLint</strong></a>; }

export function Hero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="page-hero"><div className="marketing-container page-hero-inner"><p className="marketing-kicker">{eyebrow}</p><h1>{title}</h1><p>{copy}</p><a className="marketing-button" href={APP_URL}>Open DemandLint <span aria-hidden="true">→</span></a></div></section>;
}

export function SectionHeading({ eyebrow, title, copy, align = "left" }: { eyebrow?: string; title: string; copy?: string; align?: "left" | "center" }) {
  return <header className={`section-heading-marketing ${align === "center" ? "center" : ""}`}>{eyebrow && <p className="marketing-kicker">{eyebrow}</p>}<h2>{title}</h2>{copy && <p>{copy}</p>}</header>;
}

export function Check() { return <span className="inline-check" aria-hidden="true">✓</span>; }

export function GlobalCta() { return <section className="global-cta"><div className="marketing-container global-cta-inner"><div><h2>Ready to stop fixing spreadsheets manually?</h2><p>Prepare cleaner, more reliable data with DemandLint.</p></div><a className="marketing-button marketing-button-light" href={APP_URL}>Open DemandLint <span aria-hidden="true">→</span></a></div></section>; }

export function MarketingFooter() { return <footer className="marketing-footer"><div className="marketing-container footer-grid"><div className="footer-brand"><Brand /><p>Reliable data preparation before import.</p></div><FooterColumn title="Product" links={[["Features", "/product#features"], ["How it works", "/#how-it-works"]]} /><FooterColumn title="Solutions" links={[["Use cases", "/solutions#use-cases"], ["Teams", "/solutions#teams"]]} /><FooterColumn title="Resources" links={[["Documentation", "/documentation"]]} /><FooterColumn title="Legal" links={[["Privacy", "/privacy"], ["Terms", "/terms"], ["Security", "/documentation#security-and-data"]]} /></div><div className="marketing-container footer-bottom"><span>© DemandLint</span></div></footer>; }

function FooterColumn({ title, links }: { title: string; links: string[][] }) { return <div className="footer-column"><strong>{title}</strong>{links.map(([label, href]) => <a href={href} key={label}>{label}</a>)}</div>; }

export function VisualShell({ title, meta, children, className = "" }: { title: string; meta: string; children: ReactNode; className?: string }) {
  return <div className={`product-mockup ${className}`}><div className="mockup-bar"><span className="mockup-dots"><i /><i /><i /></span><strong>{title}</strong><small>{meta}</small></div>{children}</div>;
}
