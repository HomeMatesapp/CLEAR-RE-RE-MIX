
CREATE TABLE IF NOT EXISTS public.email_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  current_week integer NOT NULL DEFAULT 1,
  total_weeks integer NOT NULL,
  next_send_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role_slug)
);

ALTER TABLE public.email_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email schedule"
  ON public.email_schedule FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email schedule"
  ON public.email_schedule FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
