import { createClient } from "@supabase/supabase-js";

export async function authorizeTradeVisionRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return { ok: false, status: 401, error: "Invalid session" };
  }

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subError) {
    console.error("Authorization lookup failed:", subError.message);
    return { ok: false, status: 503, error: "Access authorization unavailable" };
  }

  if (!sub || sub.is_approved !== true) {
    return { ok: false, status: 403, error: "Access not approved" };
  }

  return { ok: true, user, subscription: sub, supabase };
}
