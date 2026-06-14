CREATE TABLE public.role_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug text NOT NULL,
  role_name text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_views TO authenticated;
GRANT ALL ON public.role_views TO service_role;
ALTER TABLE public.role_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own role_views" ON public.role_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own role_views" ON public.role_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own role_views" ON public.role_views FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own role_views" ON public.role_views FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX role_views_user_viewed_idx ON public.role_views (user_id, viewed_at DESC);