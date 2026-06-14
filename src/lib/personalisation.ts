import { supabase } from "@/integrations/supabase/client";

export interface PersonalisationProfile {
  age_range?: string;
  highest_qualification?: string;
  employment_status?: string;
  changing_careers?: string;
  current_industry?: string;
  has_degree?: boolean;
  degree_subject?: string;
  consented_sensitive?: boolean;
  is_woman_nb?: boolean | null;
  has_disability?: boolean | null;
  is_care_leaver?: boolean | null;
  is_refugee?: boolean | null;
  is_veteran?: boolean | null;
  has_criminal_record?: boolean | null;
  personalisation_last_step?: number;
  personalisation_completed_at?: string | null;
}

const STORAGE_KEY = "cr_personalisation_v1";

export const loadLocalProfile = (): PersonalisationProfile => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const saveLocalProfile = (p: PersonalisationProfile) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
};

export const clearLocalProfile = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
};

export const loadRemoteProfile = async (userId: string): Promise<PersonalisationProfile> => {
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "age_range, highest_qualification, employment_status, changing_careers, current_industry, has_degree, degree_subject, consented_sensitive, is_woman_nb, has_disability, is_care_leaver, is_refugee, is_veteran, has_criminal_record, personalisation_last_step, personalisation_completed_at"
    )
    .eq("user_id", userId)
    .maybeSingle();
  return (data as PersonalisationProfile) || {};
};

export const saveRemoteProfile = async (userId: string, patch: PersonalisationProfile) => {
  await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
};
