-- Delete duplicate user_profiles, keeping only the oldest row per user_id
DELETE FROM public.user_profiles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.user_profiles
  ORDER BY user_id, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);