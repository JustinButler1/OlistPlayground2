/**
 * Build normalized ProductPreview from extraction.
 */

import type { ProductPreview, FieldSources, ExtractResult } from "./types";
import type { ExtractedData } from "./extract";
import { stripTrackingParams } from "./url";

export function buildPreview(extraction: ExtractedData, finalUrl: string): ExtractResult {
  if (!extraction.title) {
    return {
      ok: false,
      code: "no_product_data",
      message: "Could not extract product title from the page",
    };
  }

  const canonicalUrl = stripTrackingParams(extraction.canonicalUrl ?? finalUrl);
  let storeDomain: string;
  try {
    storeDomain = new URL(canonicalUrl).hostname.replace(/^www\./, "");
  } catch {
    storeDomain = "unknown";
  }

  // Confidence
  let confidence = 0;
  const sources: FieldSources = {};

  if (extraction.title) {
    sources.title = extraction.titleSource ?? "heuristic";
    if (extraction.titleSource === "og" || extraction.titleSource === "jsonld") {
      confidence += 0.4;
    } else {
      confidence += 0.2;
    }
  }

  if (extraction.imageUrl) {
    sources.image = extraction.imageSource ?? "heuristic";
    if (extraction.imageSource === "og" || extraction.imageSource === "jsonld") {
      confidence += 0.3;
    } else {
      confidence += 0.1;
    }
  }

  if (extraction.price != null) {
    sources.price = extraction.priceSource ?? "heuristic";
    sources.currency = extraction.priceSource ?? "heuristic";
    if (extraction.priceSource === "og" || extraction.priceSource === "jsonld") {
      confidence += 0.3;
    } else {
      confidence += 0.1;
    }
  }

  sources.canonical = extraction.canonicalSource ?? undefined;

  confidence = Math.min(1, Math.max(0, confidence));

  const extractionNotes: string[] = [];
  extractionNotes.push(`Title from: ${sources.title ?? "—"}`);
  extractionNotes.push(`Image from: ${sources.image ?? "—"}`);
  extractionNotes.push(`Price from: ${sources.price ?? "—"}`);
  extractionNotes.push(`Canonical from: ${sources.canonical ?? "final URL"}`);

  const preview: ProductPreview = {
    title: extraction.title,
    imageUrl: extraction.imageUrl,
    price: extraction.price,
    currency: extraction.currency,
    storeDomain,
    canonicalUrl,
    confidence,
    fieldSources: sources,
    debug: {
      rawExtraction: extraction.raw,
      chosenValues: {
        title: extraction.title,
        imageUrl: extraction.imageUrl,
        price: extraction.price,
        currency: extraction.currency,
        canonicalUrl,
        storeDomain,
      },
      extractionNotes,
    },
  };

  return { ok: true, preview };
}
