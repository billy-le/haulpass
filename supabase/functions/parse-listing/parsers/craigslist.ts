import type { Document } from "@b-fuze/deno-dom";
import type { ParseResult, Parser } from "./types.ts";
import { ogContent, ogImages, upgradeUrl, isListingImage, dedup } from "./utils.ts";

export const craigslistParser: Parser = (doc: Document): ParseResult => {
  // Title: dedicated element is cleaner than OG (OG includes price)
  const title =
    doc.querySelector("#titletextonly")?.textContent?.trim() ?? ogContent(doc, "title") ?? null;

  // Price: inline element in the posting header
  const price =
    doc.querySelector("span.price")?.textContent?.trim() ?? ogContent(doc, "price:amount") ?? null;

  // Description: strip the appended QR code invitation text
  const bodyEl = doc.querySelector("section#postingbody");
  const description = bodyEl
    ? bodyEl.textContent?.replace(/QR Code Link to This Post[\s\S]*/i, "").trim() || null
    : null;

  // Gallery images: #thumbs a.thumb[href] has the 600x450 URL per image.
  // Upgrade each to 1200x900 via upgradeUrl.
  const galleryImages = [...doc.querySelectorAll("#thumbs a.thumb[href]")]
    .map((el) => upgradeUrl(el.getAttribute("href") ?? ""))
    .filter(isListingImage);

  // OG image as fallback (only covers the first photo)
  const ogFallback = ogImages(doc).map(upgradeUrl).filter(isListingImage);

  return {
    title,
    images: dedup(galleryImages, ogFallback),
    description,
    price,
  };
};
