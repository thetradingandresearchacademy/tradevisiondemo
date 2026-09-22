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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    }

    const payload = req.body && Object.keys(req.body).length ? req.body : {};
    const response = await fetch(
      "https://tfpscbilfwekzvvktinm.supabase.co/functions/v1/projection_v8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify(payload)
      }
    );

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(500).json({ error: "Invalid response from Supabase", raw: text }); }
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Projection proxy error", details: String(err) });
  }
}
