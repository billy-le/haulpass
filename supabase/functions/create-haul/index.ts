import { createClient } from "jsr:@supabase/supabase-js@2";

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

  const {
    name,
    pickup_address_id,
    dropoff_address_id,
    photo_urls = [],
    notes = null,
    description = null,
    make = null,
    model = null,
    height = null,
    width = null,
    length = null,
    dimension_unit = null,
    weight = null,
    weight_unit = null,
  } = body;

  if (!name || !pickup_address_id || !dropoff_address_id) {
    return new Response("Missing required fields: name, pickup_address_id, dropoff_address_id", {
      status: 422,
    });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await svc
    .from("hauls")
    .insert({
      buyer_id: user.id,
      name,
      pickup_address_id,
      dropoff_address_id,
      photo_urls,
      notes,
      description,
      make,
      model,
      height,
      width,
      length,
      dimension_unit,
      weight,
      weight_unit,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
});
