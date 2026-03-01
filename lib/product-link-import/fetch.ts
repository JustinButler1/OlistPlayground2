/**
 * Fetch HTML with timeout and size limit.
 */

import type { FetchResult, ImportError } from "./types";

const FETCH_TIMEOUT_MS = 10_000;

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export async function fetchHtml(finalUrl: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(finalUrl, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": MOBILE_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (res.status === 403 || res.status === 429) {
      return { ok: false, code: "blocked", message: `Server responded with ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return { ok: false, code: "not_html", message: `Content-Type: ${contentType}` };
    }

    const text = await res.text();
    const resolvedUrl = typeof res.url === "string" ? res.url : finalUrl;
    return { ok: true, html: text, finalUrl: resolvedUrl };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { ok: false, code: "timeout", message: "Request timed out after 10s" };
      }
      if (err.message?.toLowerCase().includes("cors") || err.message?.toLowerCase().includes("network")) {
        return {
          ok: false,
          code: "blocked",
          message: err.message,
        };
      }
      return { ok: false, code: "fetch_failed", message: err.message };
    }
    return { ok: false, code: "fetch_failed", message: "Unknown fetch error" };
  }
}
