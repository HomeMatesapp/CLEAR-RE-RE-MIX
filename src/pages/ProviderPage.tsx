import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Provider = {
  id: string;
  name: string;
  provider_org: string | null;
  category: string | null;
  website: string | null;
  apply_url: string | null;
  who_its_for: string | null;
  publishes_outcomes: boolean | null;
  publishes_note: string | null;
  avg_graduate_salary: string | null;
  honest_notes: string | null;
  what_to_ask: string | null;
  clear_routes_note: string | null;
  prerequisites: string | null;
  job_placement_support: string | null;
  tier: string | null;
  cost_range: string | null;
  duration: string | null;
  location: string | null;
  format: string | null;
};

const ProviderPage = () => {
  const { id = "" } = useParams();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("providers").select("*").eq("id", id).maybeSingle();
      if (!cancelled) {
        setProvider(data as Provider | null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-20 max-w-2xl">
          <h1 className="font-display text-2xl">Provider not found.</h1>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const url = provider.apply_url || provider.website;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{provider.name} | Clear Routes</title>
      </Helmet>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <header>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-foreground">{provider.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            {provider.provider_org && <span>{provider.provider_org}</span>}
            {provider.category && <span>· {provider.category}</span>}
            {provider.duration && <span>· {provider.duration}</span>}
            {provider.format && <span>· {provider.format}</span>}
          </div>
        </header>

        {provider.who_its_for && (
          <section className="mt-8">
            <h2 className="font-display text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Who it's for</h2>
            <p className="text-[15px] text-foreground">{provider.who_its_for}</p>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-display text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">What they publish</h2>
          {provider.publishes_outcomes && provider.publishes_note ? (
            <p className="text-[15px] text-foreground whitespace-pre-line">
              {provider.publishes_note}
              {provider.avg_graduate_salary && ` · Average graduate salary: ${provider.avg_graduate_salary}`}
            </p>
          ) : (
            <p className="text-[15px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
              This provider has not published employment outcomes. Ask them directly before enrolling.
            </p>
          )}
        </section>

        {provider.what_to_ask && (
          <section className="mt-8">
            <h2 className="font-display text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">What to ask before enrolling</h2>
            <p className="text-[15px] text-foreground whitespace-pre-line">{provider.what_to_ask}</p>
          </section>
        )}

        {provider.clear_routes_note && (
          <section className="mt-8">
            <h2 className="font-display text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Clear Routes note</h2>
            <p className="text-[15px] text-foreground italic">{provider.clear_routes_note}</p>
          </section>
        )}

        {provider.honest_notes && (
          <section className="mt-8">
            <h2 className="font-display text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Notes</h2>
            <p className="text-[15px] text-foreground whitespace-pre-line">{provider.honest_notes}</p>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          {url && (
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                Visit website <ExternalLink className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderPage;
