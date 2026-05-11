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

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Preserve completed and in-transit hauls by nulling out buyer_id before deletion
  const { error: nullifyErr } = await svc
    .from("hauls")
    .update({ buyer_id: null })
    .eq("buyer_id", user.id)
    .in("status", ["completed", "in_transit"]);

  if (nullifyErr) {
    return new Response(JSON.stringify({ error: nullifyErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Delete the user — remaining hauls (pending/matched/cancelled) cascade via SET NULL
  const { error: deleteErr } = await svc.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    return new Response(JSON.stringify({ error: deleteErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(null, { status: 204 });
});
