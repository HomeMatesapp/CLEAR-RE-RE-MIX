import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ViewRow {
  role_slug: string;
  role_name: string;
  viewed_at: string;
}

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, firstName } = useAuth();
  const [views, setViews] = useState<ViewRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login?next=/profile");
      return;
    }
    (async () => {
      setBusy(true);
      const { data } = await supabase
        .from("role_views")
        .select("role_slug, role_name, viewed_at")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(100);
      setViews((data as ViewRow[]) || []);
      setBusy(false);
    })();
  }, [user, loading, navigate]);

  const remove = async (slug: string) => {
    if (!user) return;
    setViews((v) => v.filter((x) => x.role_slug !== slug));
    await supabase.from("role_views").delete().eq("user_id", user.id).eq("role_slug", slug);
  };

  const clearAll = async () => {
    if (!user) return;
    if (!confirm("Clear your entire viewing history?")) return;
    setViews([]);
    await supabase.from("role_views").delete().eq("user_id", user.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Your profile — Clear Routes</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-medium text-foreground">
            {firstName ? `Hi ${firstName}` : "Your profile"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{user?.email}</p>
        </header>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-medium text-foreground">Roles you've looked at</h2>
            {views.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>

          {busy ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : views.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                You haven't visited any role pages yet.
              </p>
              <Button asChild className="mt-4">
                <Link to="/">Search a career</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
              {views.map((v) => (
                <li key={v.role_slug} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <Link to={`/role/${v.role_slug}`} className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{v.role_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatWhen(v.viewed_at)}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(v.role_slug)}
                    aria-label={`Remove ${v.role_name} from history`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
