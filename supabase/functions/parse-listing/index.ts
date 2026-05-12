import { createClient } from "jsr:@supabase/supabase-js@2";
import { DOMParser } from "@b-fuze/deno-dom";
import { getParser } from "./parsers/index.ts";

const BLOCKED_TITLES = [
  "error",
  "access denied",
  "403 forbidden",
  "just a moment",
  "attention required",
  "robot check",
];

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { error: authErr } = await userClient.auth.getUser();
  if (authErr) return new Response("Unauthorized", { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") return new Response("url required", { status: 400 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    if (!res.ok) return new Response(`Site returned ${res.status}`, { status: 422 });
    html = await res.text();
  } catch {
    return new Response("Failed to fetch URL", { status: 422 });
  }

  const rawTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  if (BLOCKED_TITLES.some((t) => rawTitle.toLowerCase() === t)) {
    return new Response(
      "This site blocked the request. Try a different listing site (Craigslist, eBay, OfferUp work well).",
      { status: 422 },
    );
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const result = getParser(parsedUrl)(doc, parsedUrl);

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
