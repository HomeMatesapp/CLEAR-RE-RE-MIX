
-- Add last_visited_at to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_visited_at timestamptz;

-- Create weekly_checkins table
CREATE TABLE public.weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  week_number integer NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_checkins
CREATE POLICY "Users can view their own checkins"
  ON public.weekly_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins"
  ON public.weekly_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
