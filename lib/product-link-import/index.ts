/**
 * Product Link Import - Phase 1
 * Universal product URL extraction. No backend, no persistence.
 */

import { validateAndNormalizeUrl } from "./url";
import { fetchHtml } from "./fetch";
import { extractProduct } from "./extract";
import { buildPreview } from "./build-preview";

export type {
  ProductPreview,
  ImportError,
  ErrorCode,
  ValidateUrlResult,
  FetchResult,
  ExtractResult,
  FieldSource,
  FieldSources,
  RawExtraction,
} from "./types";

export { validateAndNormalizeUrl } from "./url";
export { fetchHtml } from "./fetch";
export { extractProduct } from "./extract";
export { buildPreview } from "./build-preview";

export interface ImportProductResult {
  ok: true;
  preview: import("./types").ProductPreview;
  finalUrl: string;
}

export type ImportProductOutput =
  | ImportProductResult
  | import("./types").ImportError;

/**
 * Full pipeline: validate URL → fetch HTML → extract → build preview.
 */
export async function importProductFromUrl(
  inputUrl: string
): Promise<ImportProductOutput> {
  const urlResult = validateAndNormalizeUrl(inputUrl);
  if (!urlResult.ok) return urlResult;

  const fetchResult = await fetchHtml(urlResult.url);
  if (!fetchResult.ok) return fetchResult;

  const extraction = extractProduct(fetchResult.html, fetchResult.finalUrl);
  const previewResult = buildPreview(extraction, fetchResult.finalUrl);

  if (!previewResult.ok) return previewResult;

  return {
    ok: true,
    preview: previewResult.preview,
    finalUrl: fetchResult.finalUrl,
  };
}
