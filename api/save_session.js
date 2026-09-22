import { authorizeTradeVisionRequest } from "./_authorize.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authorizeTradeVisionRequest(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { user, supabase } = auth;
  const { symbol, total_trades, win_rate, net_pnl } = req.body || {};

  try {
    const { error: sessionError } = await supabase
      .from("user_sessions")
      .insert({ user_id: user.id });

    if (sessionError) throw sessionError;

    // Optional analytics layer: preserve existing non-blocking behavior.
    try {
      await supabase.from("performance_archives").insert({
        user_id: user.id,
        symbol: symbol || "N/A",
        total_trades: total_trades || 0,
        win_rate: win_rate || 0,
        net_pnl: net_pnl || 0
      });
    } catch (_) {}

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Save session error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
