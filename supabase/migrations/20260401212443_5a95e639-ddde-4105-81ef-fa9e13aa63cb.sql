
-- Create hired_alumni table
CREATE TABLE public.hired_alumni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  hired_role text NOT NULL,
  company_type text,
  salary_range text,
  job_search_duration text,
  what_helped text,
  share_permission text NOT NULL DEFAULT 'anonymous',
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hired_alumni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own hired submissions"
  ON public.hired_alumni FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own hired submissions"
  ON public.hired_alumni FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view featured alumni"
  ON public.hired_alumni FOR SELECT
  TO public
  USING (is_featured = true AND share_permission != 'no');

-- Add hired fields to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_hired boolean DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS hired_at timestamptz;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS hired_role text;
