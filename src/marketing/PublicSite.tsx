import { useEffect } from "react";
import type { PublicSiteRoute } from "./publicSiteRouting";
import { DocumentationPage } from "./pages/DocumentationPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { SolutionsPage } from "./pages/SolutionsPage";
import { MarketingFooter, MarketingHeader } from "./shared";
import "./publicSite.css";

const PAGE_METADATA: Record<PublicSiteRoute, { title: string; description: string }> = {
  home: {
    title: "DemandLint — Clean, Standardize & Validate Data Before Import",
    description: "Turn inconsistent CSV and Excel files into clean, standardized and validated data ready for your CRM and business systems.",
  },
  product: {
    title: "DemandLint Product — Data Mapping, Validation & Export",
    description: "Transform inconsistent source files into predictable, validated datasets with reusable mappings, rules and export templates.",
  },
  solutions: {
    title: "DemandLint Solutions — Reliable Data Preparation for Every Team",
    description: "Create a reliable preparation layer between operational source files and the systems your teams depend on.",
  },
  documentation: {
    title: "DemandLint Documentation",
    description: "Learn how to import files, create mappings, configure templates, validate data and prepare exports with DemandLint.",
  },
};

interface PublicSiteProps { route: PublicSiteRoute; }

export function PublicSite({ route }: PublicSiteProps) {
  usePageMetadata(route);
  return (
    <div className={`marketing-site marketing-route-${route}`}>
      <MarketingHeader route={route} />
      <main>
        {route === "home" && <HomePage />}
        {route === "product" && <ProductPage />}
        {route === "solutions" && <SolutionsPage />}
        {route === "documentation" && <DocumentationPage />}
      </main>
      <MarketingFooter />
    </div>
  );
}

function usePageMetadata(route: PublicSiteRoute) {
  useEffect(() => {
    const metadata = PAGE_METADATA[route];
    document.title = metadata.title;
    setMeta("name", "description", metadata.description);
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", `${window.location.origin}${window.location.pathname}`);
    setMeta("property", "og:image", `${window.location.origin}/og.png`);
  }, [route]);
}

function setMeta(attribute: "name" | "property", value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.append(element);
  }
  element.content = content;
}
