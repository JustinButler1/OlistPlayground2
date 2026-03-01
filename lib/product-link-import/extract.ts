/**
 * HTML metadata extraction - regex-based, RN-safe.
 */

import type { RawExtraction } from "./types";

// Match <meta property="X" content="Y"> or <meta content="Y" property="X">
function getAttr(html: string, tag: "meta", attr1: string, attr2: "content" | "value"): string | undefined {
  const patterns = [
    new RegExp(`<${tag}[^>]+${attr1}=["']([^"']*)["'][^>]+${attr2}=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<${tag}[^>]+${attr2}=["']([^"']*)["'][^>]+${attr1}=["']([^"']*)["'][^>]*>`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[2];
  }
  return undefined;
}

export function getMetaProperty(html: string, prop: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return undefined;
}

export function getMetaName(html: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return undefined;
}

export function getTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : undefined;
}

export function getLinkRelCanonical(html: string): string | undefined {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return undefined;
}

export function getJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (raw) blocks.push(raw);
  }
  return blocks;
}

export function getFirstH1(html: string): string | undefined {
  const m = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : undefined;
}

// Heuristic: currency symbol + digits (e.g. $29.99, £10.50, €5,00)
const PRICE_REGEX = /(?:price|cost|from)\s*[:=]?\s*([$£€¥]\s*\d[\d.,]*|\d[\d.,]*\s*[$£€¥])/gi;

export function heuristicPrice(html: string): string | undefined {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = PRICE_REGEX.exec(html)) !== null) {
    matches.push(m[1].trim());
  }
  if (matches.length === 0) return undefined;
  // Prefer first match that looks like a reasonable price
  for (const s of matches) {
    const num = parseFloat(s.replace(/[$£€¥\s,]/g, "").replace(",", "."));
    if (!isNaN(num) && num >= 0.5 && num <= 1_000_000) return s;
  }
  return matches[0];
}

function scoreImageUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;

  if (lower.includes("logo") || lower.includes("icon") || lower.includes("sprite")) {
    score -= 30;
  }
  if (lower.includes("thumb") || lower.includes("thumbnail") || lower.includes("small")) {
    score -= 12;
  }
  if (lower.includes("main") || lower.includes("large") || lower.includes("product")) {
    score += 8;
  }

  // Capture patterns like 300x300, _SR100,100_, etc.
  const dimMatches = [
    ...lower.matchAll(/(\d{2,4})x(\d{2,4})/g),
    ...lower.matchAll(/_sr(\d{2,4}),(\d{2,4})_/g),
  ];
  for (const m of dimMatches) {
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    if (!isNaN(w) && !isNaN(h)) {
      const area = w * h;
      score += Math.min(20, area / 20000);
      if (area <= 15000) score -= 8;
      if (area >= 120000) score += 6;
    }
  }

  return score;
}

function getImageCandidates(html: string): string[] {
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const seen = new Set<string>();
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1].trim();
    if (
      src.startsWith("http") &&
      !src.includes("logo") &&
      !src.includes("icon") &&
      !src.includes("sprite") &&
      !src.endsWith(".svg") &&
      !src.startsWith("data:")
    ) {
      if (!seen.has(src)) {
        seen.add(src);
        candidates.push(src);
      }
    }
  }
  return candidates;
}

// Heuristic: choose best-looking image candidate based on URL signals.
export function heuristicImage(html: string): string | undefined {
  const candidates = getImageCandidates(html);
  if (candidates.length === 0) return undefined;

  let best = candidates[0];
  let bestScore = scoreImageUrl(best);
  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const score = scoreImageUrl(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absolutizeUrl(value: string, baseUrl: string): string | null {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

export interface ExtractedData {
  title?: string;
  titleSource?: "og" | "jsonld" | "title" | "meta" | "h1" | "heuristic";
  imageUrl?: string;
  imageSource?: "og" | "jsonld" | "meta" | "heuristic";
  price?: number;
  currency?: string;
  priceSource?: "og" | "jsonld" | "heuristic";
  canonicalUrl?: string;
  canonicalSource?: "og" | "canonical" | "jsonld";
  raw: RawExtraction;
}

export function extractProduct(html: string, finalUrl: string): ExtractedData {
  const raw: RawExtraction = {
    og: {},
    meta: {},
    jsonLdBlocks: [],
    jsonLdParsed: 0,
  };

  const ogProps = [
    "og:title",
    "og:image",
    "og:url",
    "product:price:amount",
    "product:price:currency",
  ];
  for (const p of ogProps) {
    const v = getMetaProperty(html, p);
    if (v) raw.og[p] = v;
  }

  const metaNames = ["twitter:title", "twitter:image"];
  for (const n of metaNames) {
    const v = getMetaName(html, n);
    if (v) raw.meta[n] = v;
  }

  raw.title = getTitle(html);
  raw.linkCanonical = getLinkRelCanonical(html);
  raw.jsonLdBlocks = getJsonLdBlocks(html);
  raw.h1 = getFirstH1(html);
  raw.heuristicPrice = heuristicPrice(html);
  raw.heuristicImage = heuristicImage(html);

  const result: ExtractedData = { raw };

  // 1. Title
  if (raw.og["og:title"]) {
    result.title = decodeEntities(raw.og["og:title"]);
    result.titleSource = "og";
  } else if (raw.meta["twitter:title"]) {
    result.title = decodeEntities(raw.meta["twitter:title"]);
    result.titleSource = "meta";
  } else if (raw.title) {
    result.title = decodeEntities(raw.title);
    result.titleSource = "title";
  } else if (raw.h1) {
    result.title = decodeEntities(raw.h1);
    result.titleSource = "h1";
  }

  // 2. Image
  let imageRaw: string | undefined;
  if (raw.og["og:image"]) {
    imageRaw = raw.og["og:image"];
    result.imageSource = "og";
  } else if (raw.meta["twitter:image"]) {
    imageRaw = raw.meta["twitter:image"];
    result.imageSource = "meta";
  }
  if (imageRaw) {
    result.imageUrl = absolutizeUrl(imageRaw, finalUrl) ?? undefined;
  }

  // 3. Price + currency from OG
  const ogPrice = raw.og["product:price:amount"];
  const ogCurrency = raw.og["product:price:currency"];
  if (ogPrice != null && ogPrice !== "") {
    const num = parseFloat(String(ogPrice).replace(",", "."));
    if (!isNaN(num) && num >= 0.5 && num <= 1_000_000) {
      result.price = num;
      result.currency = ogCurrency || undefined;
      result.priceSource = "og";
    }
  }

  // 4. JSON-LD Product
  for (const block of raw.jsonLdBlocks) {
    let obj: unknown;
    try {
      obj = JSON.parse(block);
      raw.jsonLdParsed++;
    } catch {
      continue;
    }

    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const o = node as Record<string, unknown>;

      if (Array.isArray(o["@graph"])) {
        for (const g of o["@graph"]) walk(g);
        return;
      }

      const type = o["@type"];
      const typeStr = Array.isArray(type) ? type.join(" ") : String(type ?? "");
      if (!typeStr.toLowerCase().includes("product")) return;

      if (!result.title && o.name) {
        result.title = decodeEntities(String(o.name));
        result.titleSource = "jsonld";
      }

      if (!result.imageUrl && o.image) {
        const img = o.image;
        const urls = Array.isArray(img) ? img.filter((u): u is string => typeof u === "string") : [img];
        const validUrls = urls.filter((u): u is string => typeof u === "string");
        if (validUrls.length > 0) {
          let best = validUrls[0];
          let bestScore = scoreImageUrl(best);
          for (let i = 1; i < validUrls.length; i++) {
            const candidate = validUrls[i];
            const score = scoreImageUrl(candidate);
            if (score > bestScore) {
              best = candidate;
              bestScore = score;
            }
          }
          result.imageUrl = absolutizeUrl(best, finalUrl) ?? undefined;
          result.imageSource = "jsonld";
        }
      }

      const offers = o.offers;
      if (offers && !result.price) {
        const arr = Array.isArray(offers) ? offers : [offers];
        for (const off of arr) {
          const offObj = off && typeof off === "object" ? (off as Record<string, unknown>) : null;
          if (!offObj || offObj.price == null) continue;
          const num = parseFloat(String(offObj.price));
          if (!isNaN(num) && num >= 0.5 && num <= 1_000_000) {
            result.price = num;
            result.currency = offObj.priceCurrency ? String(offObj.priceCurrency) : undefined;
            result.priceSource = "jsonld";
            if (!result.canonicalUrl && offObj.url) {
              const u = absolutizeUrl(String(offObj.url), finalUrl);
              if (u) result.canonicalUrl = u;
              result.canonicalSource = "jsonld";
            }
            break;
          }
        }
      }
    };

    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
    } else {
      walk(obj);
    }
  }

  // 5. Heuristic price if still missing
  if (!result.price && raw.heuristicPrice) {
    const num = parseFloat(raw.heuristicPrice.replace(/[$£€¥\s,]/g, "").replace(",", "."));
    if (!isNaN(num) && num >= 0.5 && num <= 1_000_000) {
      result.price = num;
      result.priceSource = "heuristic";
    }
  }

  // 5b. Heuristic image only if higher-priority sources missed.
  if (!result.imageUrl && raw.heuristicImage) {
    result.imageUrl = absolutizeUrl(raw.heuristicImage, finalUrl) ?? undefined;
    result.imageSource = "heuristic";
  }

  // 6. Canonical URL
  if (!result.canonicalUrl && raw.og["og:url"]) {
    const ogUrl = raw.og["og:url"];
    try {
      const ogHost = new URL(ogUrl).hostname;
      const baseHostname = new URL(finalUrl).hostname;
      if (ogHost === baseHostname) {
        result.canonicalUrl = ogUrl;
        result.canonicalSource = "og";
      }
    } catch {
      // ignore
    }
  }
  if (!result.canonicalUrl && raw.linkCanonical) {
    result.canonicalUrl = absolutizeUrl(raw.linkCanonical, finalUrl) ?? finalUrl;
    result.canonicalSource = "canonical";
  }
  if (!result.canonicalUrl) {
    result.canonicalUrl = finalUrl;
  }

  return result;
}
