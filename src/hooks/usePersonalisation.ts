import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  loadLocalProfile,
  loadRemoteProfile,
  type PersonalisationProfile,
} from "@/lib/personalisation";

export type PathwayKey = "school_leaver" | "graduate" | "adjacent" | "no_background";

export const usePersonalisation = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PersonalisationProfile>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      let p: PersonalisationProfile = loadLocalProfile();
      if (user) {
        const remote = await loadRemoteProfile(user.id);
        p = { ...p, ...remote };
      }
      setProfile(p);
      setReady(true);
    })();
  }, [user?.id]);

  return { profile, ready, isPersonalised: !!profile.personalisation_completed_at };
};

export const recommendedPathway = (
  p: PersonalisationProfile,
  available: Record<PathwayKey, string | null>
): PathwayKey | null => {
  const has = (k: PathwayKey) => !!available[k];
  const change = p.changing_careers || "";

  let candidate: PathwayKey | null = null;

  if (p.has_degree === true) {
    if (change.startsWith("No")) candidate = "adjacent";
    else if (change === "Yes, adjacent move") candidate = "adjacent";
    else candidate = "graduate";
  } else if (p.age_range === "Under 18" || p.employment_status === "Student") {
    candidate = "school_leaver";
  } else if (change === "Yes, completely new field") {
    candidate = "no_background";
  } else if (change === "Yes, adjacent move" || change.startsWith("No")) {
    candidate = "adjacent";
  } else {
    candidate = "no_background";
  }

  if (candidate && has(candidate)) return candidate;
  // Fallback to first available in a sensible order
  const order: PathwayKey[] = ["graduate", "adjacent", "no_background", "school_leaver"];
  return order.find(has) || null;
};

export const personalisationBanner = (
  p: PersonalisationProfile,
  roleName: string
): string | null => {
  if (!p.personalisation_completed_at) return null;
  const bits: string[] = [];
  if (p.has_degree && p.degree_subject) {
    bits.push(`Because you already have a degree in ${p.degree_subject}, your route to ${roleName} is likely shorter than starting from scratch.`);
  } else if (p.has_degree) {
    bits.push(`Because you already have a degree, your route to ${roleName} is likely shorter than starting from scratch.`);
  } else if (p.age_range === "Under 18") {
    bits.push(`Showing the school-leaver route first — you have time to take the longer, higher-reward path.`);
  } else if (p.changing_careers === "Yes, completely new field") {
    bits.push(`Because you're switching to a completely new field, we're showing the no-background route first.`);
  } else if (p.changing_careers === "Yes, adjacent move") {
    bits.push(`Because you're making an adjacent move, we're showing the career-changer route first.`);
  }
  return bits.join(" ") || null;
};
