import type { Parser } from "./types.ts";
import { craigslistParser } from "./craigslist.ts";
import { offerupParser } from "./offerup.ts";
import { genericParser } from "./generic.ts";

export function getParser(url: URL): Parser {
  const host = url.hostname;
  if (host.includes("craigslist.org")) return craigslistParser;
  if (host.includes("offerup.com")) return offerupParser;
  return genericParser;
}
