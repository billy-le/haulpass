import type { Document } from "@b-fuze/deno-dom";
import type { ParseResult, Parser } from "./types.ts";
import { ogContent, ogImages, isListingImage, dedup } from "./utils.ts";

export const offerupParser: Parser = (doc: Document): ParseResult => {
  // JSON-LD Product schema has all item images (250px thumbnails but correct photos)
  let jsonldImages: string[] = [];
  let title: string | null = null;
  let description: string | null = null;
  let price: string | null = null;

  for (const script of doc.querySelectorAll(`script[type="application/ld+json"]`)) {
    try {
      const data = JSON.parse(script.textContent ?? "{}");
      const item = Array.isArray(data) ? data[0] : data;
      if (item?.["@type"] !== "Product") continue;

      title ??= item?.name ?? null;
      description ??= item?.description ?? null;
      price ??= item?.offers?.price?.toString() ?? null;

      const imgs = item?.image;
      if (Array.isArray(imgs)) {
        jsonldImages = imgs.filter((s: unknown) => typeof s === "string" && isListingImage(s));
      } else if (typeof imgs === "string" && isListingImage(imgs)) {
        jsonldImages = [imgs];
      }
      break;
    } catch {
      // malformed JSON-LD — skip
    }
  }

  // OG image is the first item photo at full resolution — use it to replace the
  // 250px JSON-LD thumbnail for that same image.
  const ogImg = ogImages(doc).find(isListingImage) ?? null;

  // Build final list: OG first (full quality), then remaining JSON-LD images
  // (skipping index 0 since OG covers that photo).
  const rest = ogImg ? jsonldImages.slice(1) : jsonldImages;
  const images = dedup(ogImg ? [ogImg] : [], rest);

  return {
    title: title ?? ogContent(doc, "title") ?? null,
    images,
    description: description ?? ogContent(doc, "description") ?? null,
    price,
  };
};
