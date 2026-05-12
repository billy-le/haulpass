import type { Document, Element } from "@b-fuze/deno-dom";

export function ogContent(doc: Document, prop: string): string | null {
  return doc.querySelector(`meta[property="og:${prop}"]`)?.getAttribute("content") ?? null;
}

export function ogImages(doc: Document): string[] {
  return [...doc.querySelectorAll(`meta[property="og:image"]`)]
    .map((el) => el.getAttribute("content"))
    .filter((src): src is string => !!src && src.startsWith("http"));
}

export function jsonLd(doc: Document): {
  title: string | null;
  description: string | null;
  price: string | null;
} {
  let title: string | null = null;
  let description: string | null = null;
  let price: string | null = null;

  for (const script of doc.querySelectorAll(`script[type="application/ld+json"]`)) {
    try {
      const data = JSON.parse(script.textContent ?? "{}");
      const item = Array.isArray(data) ? data[0] : data;
      title ??= item?.name ?? null;
      description ??= item?.description ?? null;
      price ??= item?.offers?.price?.toString() ?? item?.price?.toString() ?? null;
    } catch {
      // malformed JSON-LD — skip
    }
  }

  return { title, description, price };
}

// Resolve highest-quality src from an img element.
// Priority: data-full > largest srcset > lazy-load attrs > src
export function bestSrc(el: Element): string {
  const dataFull = el.getAttribute("data-full");
  if (dataFull) return dataFull;

  const srcset = el.getAttribute("srcset");
  if (srcset) {
    const largest =
      srcset
        .split(",")
        .map((s) => s.trim().split(/\s+/))
        .filter((parts) => parts.length >= 1)
        .sort((a, b) => parseInt(b[1] ?? "0") - parseInt(a[1] ?? "0"))[0]?.[0] ?? "";
    if (largest.startsWith("http")) return largest;
  }

  return (
    el.getAttribute("data-src") ??
    el.getAttribute("data-original") ??
    el.getAttribute("data-lazy-src") ??
    el.getAttribute("src") ??
    ""
  );
}

// Upgrade known CDN thumbnail URLs to full quality.
export function upgradeUrl(src: string): string {
  // Craigslist: _600x450.jpg / _50x50c.jpg → _1200x900.jpg
  if (src.includes("images.craigslist.org")) {
    return src.replace(/_\d+x\d+c?(\.\w+)$/, "_1200x900$1");
  }
  return src;
}

export function isListingImage(src: string): boolean {
  return (
    src.startsWith("http") &&
    !src.includes("1x1") &&
    !src.includes("pixel") &&
    !src.includes("logo") &&
    !src.includes("icon")
  );
}

// Merge multiple image lists, deduplicating by URL. Earlier lists take priority.
export function dedup(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const src of lists.flat()) {
    if (!seen.has(src)) {
      seen.add(src);
      result.push(src);
    }
  }
  return result;
}
