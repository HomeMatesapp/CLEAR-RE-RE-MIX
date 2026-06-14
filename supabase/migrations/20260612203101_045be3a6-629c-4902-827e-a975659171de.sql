ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS previous_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES public.roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS roles_previous_slugs_gin_idx
  ON public.roles USING gin (previous_slugs);

CREATE INDEX IF NOT EXISTS roles_merged_into_idx
  ON public.roles (merged_into);