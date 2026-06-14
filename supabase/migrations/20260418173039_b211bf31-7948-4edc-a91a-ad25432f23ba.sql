-- Add per-user daily AI generation counters to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pathways_generated_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pathways_reset_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS pdfs_generated_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdfs_reset_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS weekly_plans_generated_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_plans_reset_at timestamptz NOT NULL DEFAULT now();

-- Atomic check-and-increment of a daily counter on user_profiles.
-- Returns the post-increment count, or -1 if the user is over the limit.
-- Resets the counter and reset timestamp if more than 24 hours have passed.
-- SECURITY DEFINER so the edge function (service role) can call it for any user
-- without an extra RLS policy round-trip.
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
  _user_id uuid,
  _kind text,
  _limit integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
  _reset_at timestamptz;
  _new_count integer;
BEGIN
  -- Ensure a profile row exists for this user (no-op if already there).
  INSERT INTO public.user_profiles (user_id)
  VALUES (_user_id)
  ON CONFLICT DO NOTHING;

  IF _kind = 'pathway' THEN
    SELECT pathways_generated_today, pathways_reset_at
      INTO _current_count, _reset_at
    FROM public.user_profiles
    WHERE user_id = _user_id
    FOR UPDATE;

    IF _reset_at < now() - INTERVAL '24 hours' THEN
      _current_count := 0;
      UPDATE public.user_profiles
        SET pathways_reset_at = now(), pathways_generated_today = 0
      WHERE user_id = _user_id;
    END IF;

    IF _current_count >= _limit THEN
      RETURN -1;
    END IF;

    UPDATE public.user_profiles
      SET pathways_generated_today = pathways_generated_today + 1
    WHERE user_id = _user_id
    RETURNING pathways_generated_today INTO _new_count;
    RETURN _new_count;

  ELSIF _kind = 'pdf' THEN
    SELECT pdfs_generated_today, pdfs_reset_at
      INTO _current_count, _reset_at
    FROM public.user_profiles
    WHERE user_id = _user_id
    FOR UPDATE;

    IF _reset_at < now() - INTERVAL '24 hours' THEN
      _current_count := 0;
      UPDATE public.user_profiles
        SET pdfs_reset_at = now(), pdfs_generated_today = 0
      WHERE user_id = _user_id;
    END IF;

    IF _current_count >= _limit THEN
      RETURN -1;
    END IF;

    UPDATE public.user_profiles
      SET pdfs_generated_today = pdfs_generated_today + 1
    WHERE user_id = _user_id
    RETURNING pdfs_generated_today INTO _new_count;
    RETURN _new_count;

  ELSIF _kind = 'weekly_plan' THEN
    SELECT weekly_plans_generated_today, weekly_plans_reset_at
      INTO _current_count, _reset_at
    FROM public.user_profiles
    WHERE user_id = _user_id
    FOR UPDATE;

    IF _reset_at < now() - INTERVAL '24 hours' THEN
      _current_count := 0;
      UPDATE public.user_profiles
        SET weekly_plans_reset_at = now(), weekly_plans_generated_today = 0
      WHERE user_id = _user_id;
    END IF;

    IF _current_count >= _limit THEN
      RETURN -1;
    END IF;

    UPDATE public.user_profiles
      SET weekly_plans_generated_today = weekly_plans_generated_today + 1
    WHERE user_id = _user_id
    RETURNING weekly_plans_generated_today INTO _new_count;
    RETURN _new_count;
  END IF;

  RAISE EXCEPTION 'Unknown AI usage kind: %', _kind;
END;
$$;

-- Lock down execution: only the service role (used by edge functions) can call this.
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(uuid, text, integer) TO service_role;