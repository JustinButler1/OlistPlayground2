/**
 * Product Link Import - Phase 1
 * Types and error codes for universal product URL extraction.
 */

export type ErrorCode =
  | "invalid_url"
  | "fetch_failed"
  | "timeout"
  | "blocked"
  | "not_html"
  | "too_large"
  | "parse_failed"
  | "no_product_data";

export interface ImportError {
  ok: false;
  code: ErrorCode;
  message?: string;
}

export interface UrlValidationResult {
  ok: true;
  url: string;
}

export type ValidateUrlResult = UrlValidationResult | ImportError;

export interface FetchHtmlResult {
  ok: true;
  html: string;
  finalUrl: string;
}

export type FetchResult = FetchHtmlResult | ImportError;

export type FieldSource =
  | "og"
  | "jsonld"
  | "title"
  | "meta"
  | "h1"
  | "heuristic"
  | "canonical";

export interface FieldSources {
  title?: FieldSource;
  image?: FieldSource;
  price?: FieldSource;
  currency?: FieldSource;
  canonical?: FieldSource;
}

export interface RawExtraction {
  og: Record<string, string>;
  meta: Record<string, string>;
  title?: string;
  linkCanonical?: string;
  jsonLdBlocks: string[];
  jsonLdParsed: number;
  h1?: string;
  heuristicPrice?: string;
  heuristicImage?: string;
}

export interface ProductPreview {
  title: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  storeDomain: string;
  canonicalUrl: string;
  confidence: number;
  fieldSources: FieldSources;
  debug: {
    rawExtraction: RawExtraction;
    chosenValues: {
      title: string;
      imageUrl?: string;
      price?: number;
      currency?: string;
      canonicalUrl: string;
      storeDomain: string;
    };
    extractionNotes: string[];
  };
}

export interface ExtractionResult {
  ok: true;
  preview: ProductPreview;
}

export type ExtractResult = ExtractionResult | ImportError;
