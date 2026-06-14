import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { slugifyRole } from "@/lib/role";
import { trackEvent } from "@/lib/posthog";

const exampleRoles = [
  { name: "AI Engineer", slug: "ai-engineer" },
  { name: "Electrician", slug: "electrician" },
  { name: "Barrister", slug: "barrister" },
  { name: "Midwife", slug: "midwife" },
  { name: "Graphic Designer", slug: "graphic-designer" },
];

type Suggestion = { role_name: string; role_slug: string };

const Index = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Lightweight client-side autocomplete using ILIKE
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("roles")
        .select("role_name, role_slug")
        .ilike("role_name", `%${q}%`)
        .limit(8);
      setSuggestions(data || []);
    }, 120);
    return () => clearTimeout(handle);
  }, [query]);

  const submit = (role: string, source: "search_box" | "example_chip" | "suggestion") => {
    const trimmed = role.trim();
    if (!trimmed) return;
    trackEvent("search_submitted", { role: trimmed, source });
    // Suggestion clicks are already exact roles → go straight there.
    // Everything else goes through the search results page, which will
    // auto-redirect when there's a single match.
    if (source === "suggestion") {
      navigate(`/role/${slugifyRole(trimmed)}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Clear Routes — the honest picture on UK careers</title>
        <meta
          name="description"
          content="Search 1,000 UK careers and see the realistic route into them. Salaries, demand, providers, and the uncomfortable truth."
        />
      </Helmet>

      <Navbar />

      <main className="flex-1 flex items-center">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium leading-tight text-foreground tracking-tight">
              Before you spend thousands on training,<br />
              <span className="text-primary">get the honest picture.</span>
            </h1>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(query, "search_box");
              }}
              className="mt-12 relative"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search a career..."
                  className="h-14 pl-12 pr-28 text-base rounded-xl border-border shadow-sm"
                  autoFocus
                />
                <Button type="submit" className="absolute right-2 top-2 h-10">
                  Search
                </Button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden text-left">
                  {suggestions.map((s) => (
                    <button
                      key={s.role_slug}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => submit(s.role_name, "suggestion")}
                      className="block w-full px-4 py-3 text-sm hover:bg-muted text-foreground"
                    >
                      {s.role_name}
                    </button>
                  ))}
                </div>
              )}
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
              Search 1,000 UK careers and see the realistic route into them.
            </p>

            <div className="mt-10 flex flex-wrap gap-2 justify-center text-sm">
              {exampleRoles.map((r) => (
                <button
                  key={r.slug}
                  onClick={() => submit(r.name, "example_chip")}
                  className="px-4 py-2 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors"
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
