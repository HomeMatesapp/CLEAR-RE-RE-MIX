import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://clearroutes.co.uk",
  "https://www.clearroutes.co.uk",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const CACHE_TTL_HOURS = 24;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { role, location = "uk" } = await req.json();

    if (!role || typeof role !== "string") {
      return new Response(JSON.stringify({ error: "role is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const roleSlug = role.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Check cache
    const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("job_market_cache")
      .select("job_count, location, role_slug, fetched_at, listings_sample")
      .eq("role_slug", roleSlug)
      .eq("location", location)
      .gte("fetched_at", cutoff)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({
          job_count: cached.job_count,
          location: cached.location,
          role: roleSlug,
          listings_sample: cached.listings_sample,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Reed API
    const reedApiKey = Deno.env.get("REED_API_KEY");
    if (!reedApiKey) {
      return new Response(
        JSON.stringify({ error: "REED_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reed uses Basic auth with API key as username, empty password
    const reedAuth = btoa(`${reedApiKey}:`);
    const locationParam = location === "uk" ? "" : `&locationName=${encodeURIComponent(location)}`;
    // Fetch 15 results to build listings_sample
    const reedUrl = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(role)}${locationParam}&resultsToTake=15`;

    let jobCount: number | null = null;
    let listingsSample: { title: string; description: string }[] | null = null;

    try {
      const reedRes = await fetch(reedUrl, {
        headers: { Authorization: `Basic ${reedAuth}` },
      });

      if (reedRes.ok) {
        const reedData = await reedRes.json() as {
          totalResults?: number;
          results?: { jobTitle?: string; jobDescription?: string }[];
        };
        jobCount = reedData.totalResults ?? null;

        // Extract top 15 listing summaries
        if (reedData.results && Array.isArray(reedData.results)) {
          listingsSample = reedData.results.slice(0, 15).map((r) => ({
            title: r.jobTitle || "",
            description: (r.jobDescription || "").slice(0, 500),
          }));
        }
      }
    } catch (e) {
      console.error("Reed API error:", e);
    }

    // Upsert cache
    await supabase
      .from("job_market_cache")
      .upsert(
        {
          role_slug: roleSlug,
          location,
          job_count: jobCount,
          avg_salary: null,
          sources: { reed: true },
          listings_sample: listingsSample,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "role_slug,location" }
      );

    return new Response(
      JSON.stringify({
        job_count: jobCount,
        location,
        role: roleSlug,
        listings_sample: listingsSample,
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-job-count error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
