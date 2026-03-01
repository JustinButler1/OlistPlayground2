/**
 * URL validation and normalization.
 */

import type { ImportError, ValidateUrlResult } from "./types";

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
];

function isPrivateOrLocalHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "::1") return true;
  const lower = hostname.toLowerCase();
  if (lower.startsWith("127.") || lower === "localhost") return true;
  return PRIVATE_IP_RANGES.some((re) => re.test(hostname));
}

const TRACKING_PARAMS = /[?&](utm_[^&]*|gclid|fbclid|gclsrc)[^&]*/gi;

export function stripTrackingParams(urlStr: string): string {
  return urlStr.replace(TRACKING_PARAMS, "").replace(/\?&/, "?").replace(/\?$/, "");
}

export function validateAndNormalizeUrl(input: string): ValidateUrlResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, code: "invalid_url", message: "URL is required" };
  }

  let urlStr = trimmed;

  // Remove fragment
  const hashIdx = urlStr.indexOf("#");
  if (hashIdx >= 0) {
    urlStr = urlStr.slice(0, hashIdx);
  }

  // Add scheme if missing
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = "https://" + urlStr;
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { ok: false, code: "invalid_url", message: "Invalid URL format" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "invalid_url", message: "Only http and https are allowed" };
  }

  const hostname = url.hostname;
  if (isPrivateOrLocalHost(hostname)) {
    return { ok: false, code: "invalid_url", message: "Private and localhost URLs are not allowed" };
  }

  return { ok: true, url: url.toString() };
}
