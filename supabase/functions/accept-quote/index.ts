import { createClient } from "@supabase/supabase-js";
import Stripe from "npm:stripe@17";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) return new Response("Unauthorized", { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { quote_id } = body;
  if (!quote_id || typeof quote_id !== "string") {
    return new Response("Missing required field: quote_id", { status: 422 });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch quote with its haul
  const { data: quote, error: quoteErr } = await svc
    .from("haul_quotes")
    .select("*, haul:hauls(*)")
    .eq("id", quote_id)
    .single();

  if (quoteErr || !quote) {
    return new Response("Quote not found", { status: 404 });
  }

  const haul = quote.haul;

  if (haul.buyer_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }
  if (haul.status !== "pending") {
    return new Response("Haul is no longer pending", { status: 409 });
  }
  if (quote.status !== "pending") {
    return new Response("Quote is no longer pending", { status: 409 });
  }

  // Create Stripe PaymentIntent before mutating DB — if this fails, haul stays pending
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: quote.amount_cents,
    currency: "usd",
    metadata: { haul_id: haul.id, quote_id },
  });

  // Update haul: set pro_id + status = matched
  const { error: haulErr } = await svc
    .from("hauls")
    .update({ pro_id: quote.pro_id, status: "matched" })
    .eq("id", haul.id);
  if (haulErr) {
    return new Response(JSON.stringify({ error: haulErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Accept the chosen quote; reject all others for this haul
  await svc
    .from("haul_quotes")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", quote_id);

  await svc
    .from("haul_quotes")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("haul_id", haul.id)
    .neq("id", quote_id)
    .eq("status", "pending");

  // Insert payment record
  const { data: payment, error: paymentErr } = await svc
    .from("payments")
    .insert({
      haul_id: haul.id,
      quote_id,
      amount_cents: quote.amount_cents,
      currency: "usd",
      status: "pending",
      stripe_payment_intent_id: paymentIntent.id,
    })
    .select()
    .single();

  if (paymentErr) {
    return new Response(JSON.stringify({ error: paymentErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(payment), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
});
