
CREATE TABLE public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_answers jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz results" ON public.quiz_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.saved_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug text NOT NULL,
  role_title text NOT NULL,
  pathway_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role_slug)
);

ALTER TABLE public.saved_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own saved pathways" ON public.saved_pathways
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own saved pathways" ON public.saved_pathways
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved pathways" ON public.saved_pathways
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
