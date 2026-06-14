ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS pathway_family smallint;
COMMENT ON COLUMN public.roles.pathway_family IS 'Pathway family taxonomy v1: 1-28 per Clear Routes spec; NULL = unassigned/needs human review';

CREATE TABLE IF NOT EXISTS public.pathway_families (
  id smallint PRIMARY KEY,
  name text NOT NULL,
  description text
);
GRANT SELECT ON public.pathway_families TO anon, authenticated;
GRANT ALL ON public.pathway_families TO service_role;
ALTER TABLE public.pathway_families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read pathway_families" ON public.pathway_families;
CREATE POLICY "public read pathway_families" ON public.pathway_families FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.pathway_families (id, name) VALUES
  (1,'Medicine, Dentistry & Veterinary'),
  (2,'Post-Qualification Specialisms'),
  (3,'Regulated Health Professions'),
  (4,'Psychological & Therapy Professions'),
  (5,'Social Work & Regulated Care'),
  (6,'Teaching (Schools)'),
  (7,'Academic & Research Science'),
  (8,'Engineering (Chartered)'),
  (9,'Built Environment Professional'),
  (10,'Skilled Trades'),
  (11,'Licensed & Ticketed Work'),
  (12,'Law'),
  (13,'Finance & Accountancy'),
  (14,'Tech, Data & Digital'),
  (15,'Public Service & Civil Service'),
  (16,'Uniformed & Frontline Services'),
  (17,'Creative Portfolio Careers'),
  (18,'Performing & Audition Careers'),
  (19,'Media, Journalism & Publishing'),
  (20,'Craft & Making Trades'),
  (21,'Hospitality, Events & Service'),
  (22,'Sales, Retail & Commercial'),
  (23,'Care & Support Work'),
  (24,'Land, Animal & Outdoor Work'),
  (25,'Transport & Logistics'),
  (26,'Self-Employed & Business-Building'),
  (27,'Reputation-Gated Careers'),
  (28,'Talent-Lottery Careers')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

DO $$ BEGIN
  ALTER TABLE public.roles
    ADD CONSTRAINT roles_pathway_family_fkey FOREIGN KEY (pathway_family) REFERENCES public.pathway_families(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
