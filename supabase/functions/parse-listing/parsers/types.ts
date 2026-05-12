import type { Document } from "@b-fuze/deno-dom";

export interface ParseResult {
  title: string | null;
  images: string[];
  description: string | null;
  price: string | null;
}

export type Parser = (doc: Document, url: URL) => ParseResult;
