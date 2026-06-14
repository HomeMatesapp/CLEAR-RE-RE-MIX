import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Org = {
  id: string;
  name: string;
  audience: string[];
  description: string | null;
  what_they_offer: string | null;
  website: string | null;
  category: string | null;
};

const filters = [
  { key: "all",            label: "All" },
  { key: "government",     label: "Government funded" },
  { key: "woman_nb",       label: "Women and non-binary" },
  { key: "disability",     label: "Disability support" },
  { key: "under_25",       label: "Under 25" },
  { key: "care_leaver",    label: "Care leavers" },
  { key: "refugee",        label: "New to UK" },
  { key: "veteran",        label: "Veterans" },
  { key: "criminal_record",label: "Criminal record" },
  { key: "career_changer", label: "Career changers" },
];

const Support = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [active, setActive] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("support_organisations")
        .select("*")
        .order("display_order", { ascending: true });
      setOrgs((data as Org[] | null) || []);
    })();
  }, []);

  const visible = active === "all" ? orgs : orgs.filter((o) => o.audience?.includes(active));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Funded support & access programmes | Clear Routes</title>
        <meta name="description" content="Government schemes, grants, and funded programmes that could change what's available to you." />
      </Helmet>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <header>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-foreground">
            Funded support and access programmes
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Government schemes, grants, and funded programmes that could change what's available to you.
            Most people who qualify for these don't know they exist.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          {visible.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-5 flex flex-col">
              <h3 className="font-display font-semibold text-foreground">{o.name}</h3>
              {o.description && (
                <p className="text-sm text-muted-foreground mt-1">{o.description}</p>
              )}
              {o.what_they_offer && (
                <p className="text-sm text-foreground mt-3">{o.what_they_offer}</p>
              )}
              {o.website && (
                <a
                  href={o.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Visit website <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground">No organisations match this filter yet.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
