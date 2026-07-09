// ---------------------------------------------------------------------------
// delete-account Edge Function
// Permanently deletes the CALLING user's own account. Deploy with:
//   supabase functions deploy delete-account
// Requires env (set automatically on Supabase): SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.
//
// What it does, in order:
//   1. Verifies the caller's JWT (users can only delete themselves).
//   2. Takes any owned shop offline (is_active = false) so listings
//      disappear immediately even if later steps are interrupted.
//   3. Deletes the profiles row (personal data).
//   4. Deletes the auth user via the admin API.
// Review your FK ON DELETE behavior: activity records (claims, votes,
// suggestions) either cascade or remain with a dangling user id —
// confirm the retention outcome matches your Privacy Policy.
// ---------------------------------------------------------------------------
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not signed in." }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Take any owned business offline immediately.
    await admin.from("shops").update({ is_active: false }).eq("owner_id", user.id);

    // 2. Remove personal data.
    await admin.from("profiles").delete().eq("id", user.id);

    // 3. Delete the auth user.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
