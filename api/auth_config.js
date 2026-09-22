export default async function handler(req, res) {

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {

    return res.status(500).json({
      error: "Missing Supabase environment variables"
    });
  }

  return res.status(200).json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}
