-- Create providers table
CREATE TABLE public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider_org TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bootcamp', 'apprenticeship', 'enhancement')),
  roles_covered TEXT[] NOT NULL,
  duration TEXT,
  format TEXT,
  apply_url TEXT,
  overview TEXT,
  why_good TEXT,
  pathfinder_approved BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create funding_windows table
CREATE TABLE public.funding_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  funder TEXT,
  ca_slugs TEXT[],
  funding_type TEXT CHECK (funding_type IN ('full', 'partial', 'eligibility_based')),
  funding_label TEXT,
  valid_from DATE,
  valid_until DATE,
  eligibility_notes TEXT,
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pathways table
CREATE TABLE public.pathways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_slug TEXT UNIQUE NOT NULL,
  role_title TEXT NOT NULL,
  pathway_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  postcode TEXT,
  combined_authority TEXT,
  has_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create progress_tracking table
CREATE TABLE public.progress_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_slug TEXT,
  completed_stages TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;

-- Providers: publicly readable
CREATE POLICY "Providers are publicly readable" ON public.providers FOR SELECT USING (true);

-- Funding windows: publicly readable
CREATE POLICY "Funding windows are publicly readable" ON public.funding_windows FOR SELECT USING (true);

-- Pathways: publicly readable
CREATE POLICY "Pathways are publicly readable" ON public.pathways FOR SELECT USING (true);

-- User profiles: users can manage their own
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Progress tracking: users can manage their own
CREATE POLICY "Users can view their own progress" ON public.progress_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.progress_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.progress_tracking FOR UPDATE USING (auth.uid() = user_id);

-- Timestamp trigger for pathways
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pathways_updated_at
  BEFORE UPDATE ON public.pathways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
  BEFORE UPDATE ON public.progress_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();