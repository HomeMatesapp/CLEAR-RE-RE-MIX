const PRIMARY_ORIGIN = "https://clearroutes.co.uk";

const ALLOWED_ORIGINS = new Set([
  PRIMARY_ORIGIN,
  "https://www.clearroutes.co.uk",
  "http://localhost:8080",
  "http://localhost:5173",
]);

// Lovable serves previews/publishes from both lovable.app and
// lovableproject.com subdomains, depending on project vintage.
const isAllowedPreview = (origin: string) =>
  /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/.test(origin);

export const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin) || isAllowedPreview(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : PRIMARY_ORIGIN,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
};
