import { authorizeTradeVisionRequest } from "./_authorize.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authorizeTradeVisionRequest(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { user, subscription: sub, supabase } = auth;
  let plan = "free";

  if (sub.is_admin === true) {
    plan = "admin";
  } else {
    const now = new Date();
    const subscriptionActive =
      sub.status === "active" &&
      (
        (sub.subscription_expires_at && new Date(sub.subscription_expires_at) > now) ||
        (sub.trial_expires_at && new Date(sub.trial_expires_at) > now)
      );

    if (subscriptionActive) {
      plan = sub.plan || "free";
    }
  }

  if (plan !== "free") {
    return res.status(200).json({ plan, remainingSessions: "unlimited" });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error: countError } = await supabase
    .from("user_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString());

  if (countError) {
    console.error("Session count failed:", countError.message);
    return res.status(503).json({ error: "Access authorization unavailable" });
  }

  return res.status(200).json({
    plan: "free",
    remainingSessions: Math.max(0, 3 - (count || 0))
  });
}
