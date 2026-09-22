import { authorizeTradeVisionRequest } from "./_authorize.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await authorizeTradeVisionRequest(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const response = await fetch(
      "https://tfpscbilfwekzvvktinm.supabase.co/functions/v1/symbols",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify(req.body || {})
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Proxy error", details: String(err) });
  }
}
