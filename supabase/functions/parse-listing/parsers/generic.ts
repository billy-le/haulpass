import type { Document } from "@b-fuze/deno-dom";
import type { ParseResult, Parser } from "./types.ts";
import {
  ogContent,
  ogImages,
  jsonLd,
  bestSrc,
  upgradeUrl,
  isListingImage,
  dedup,
} from "./utils.ts";

export const genericParser: Parser = (doc: Document): ParseResult => {
  const og = {
    title: ogContent(doc, "title"),
    description: ogContent(doc, "description"),
    price: ogContent(doc, "price:amount"),
    images: ogImages(doc).map(upgradeUrl).filter(isListingImage),
  };

  const ld = jsonLd(doc);

  const domImages = [...doc.querySelectorAll("img")]
    .map((el) => upgradeUrl(bestSrc(el)))
    .filter(isListingImage);

  return {
    title: og.title ?? ld.title ?? doc.querySelector("title")?.textContent?.trim() ?? null,
    images: dedup(og.images, domImages),
    description: og.description ?? ld.description ?? null,
    price: og.price ?? ld.price ?? null,
  };
};
