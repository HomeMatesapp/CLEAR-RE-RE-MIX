import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { ANALYTICS_CONSENT_EVENT, identifyUser, resetUser } from "@/lib/posthog";
import { flushPendingDecision } from "@/lib/saved-decisions";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  firstName: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  firstName: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string | null>(null);

  const ensureProfile = async (authUser: User) => {
    const userId = authUser.id;
    const metadataFirstName = typeof authUser.user_metadata?.first_name === "string"
      ? authUser.user_metadata.first_name.trim()
      : "";
    const { data } = await supabase
      .from("user_profiles")
      .select("first_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      // Use upsert to avoid duplicates
      await supabase.from("user_profiles").upsert(
        { user_id: userId, first_name: metadataFirstName || null },
        { onConflict: "user_id" }
      );
      setFirstName(metadataFirstName || null);
    } else {
      if (!data.first_name && metadataFirstName) {
        await supabase
          .from("user_profiles")
          .update({ first_name: metadataFirstName })
          .eq("user_id", userId);
      }
      setFirstName(data.first_name || metadataFirstName || null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          identifyUser(session.user.id);
          ensureProfile(session.user);
          // Flush any decision the user stashed before signing in,
          // regardless of which page they land on.
          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            flushPendingDecision(session.user.id).catch(() => {});
          }
        } else {
          resetUser();
          setFirstName(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        identifyUser(session.user.id);
        ensureProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const identifyAfterConsent = () => identifyUser(user.id);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, identifyAfterConsent);
    identifyAfterConsent();
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, identifyAfterConsent);
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, firstName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
