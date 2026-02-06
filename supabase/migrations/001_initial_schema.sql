-- Initial database schema (reference only - already applied to production)
-- Extracted from src/lib/database-setup.ts before removal (security: removed service role key from client bundle)

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  preferred_instruments TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR is_public = true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, onboarding_completed, preferred_instruments)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', false, ARRAY[]::TEXT[]);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view classrooms"
  ON public.classrooms FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create classrooms"
  ON public.classrooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own classrooms"
  ON public.classrooms FOR DELETE
  USING (auth.uid() = created_by);

-- Classroom students
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, user_id)
);

ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enrollments"
  ON public.classroom_students FOR SELECT USING (true);

CREATE POLICY "Users can join classrooms"
  ON public.classroom_students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave classrooms"
  ON public.classroom_students FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can remove students"
  ON public.classroom_students FOR DELETE
  USING (
    auth.uid() IN (
      SELECT created_by FROM public.classrooms WHERE id = classroom_id
    )
  );

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT NOT NULL,
  instrument TEXT NOT NULL,
  bpm INTEGER NOT NULL DEFAULT 120,
  beats INTEGER NOT NULL DEFAULT 5,
  chord_count INTEGER DEFAULT 4,
  scales TEXT[] DEFAULT ARRAY['Major', 'Minor'],
  chords TEXT[] DEFAULT ARRAY['Major', 'Minor'],
  octave_low INTEGER DEFAULT 4,
  octave_high INTEGER DEFAULT 5,
  fret_low INTEGER DEFAULT 0,
  fret_high INTEGER DEFAULT 12,
  selection_data JSONB DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assignments"
  ON public.assignments FOR SELECT USING (true);

CREATE POLICY "Classroom owners can create assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.classrooms WHERE id = classroom_id
    )
  );

CREATE POLICY "Classroom owners can update assignments"
  ON public.assignments FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Classroom owners can delete assignments"
  ON public.assignments FOR DELETE
  USING (auth.uid() = created_by);

-- Assignment completions
CREATE TABLE IF NOT EXISTS public.assignment_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

ALTER TABLE public.assignment_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view completions"
  ON public.assignment_completions FOR SELECT USING (true);

CREATE POLICY "Users can insert own completions"
  ON public.assignment_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Practice sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'sandbox',
  instrument TEXT NOT NULL,
  melodies_completed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON public.practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
