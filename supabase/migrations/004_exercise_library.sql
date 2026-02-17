-- Exercise Library + Lesson Templates
-- Enables teachers to save/reuse exercise blocks and full lesson templates

-- Saved exercise blocks per user
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  instrument TEXT NOT NULL,
  exercise_data JSONB NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercises and public ones"
  ON public.exercise_library FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own exercises"
  ON public.exercise_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
  ON public.exercise_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
  ON public.exercise_library FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_library_user_id ON public.exercise_library(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_instrument ON public.exercise_library(instrument);

-- Saved lesson templates per user + system defaults
CREATE TABLE IF NOT EXISTS public.lesson_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instrument TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  exercises JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lesson_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates and system templates"
  ON public.lesson_templates FOR SELECT
  USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can create own templates"
  ON public.lesson_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own templates"
  ON public.lesson_templates FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own templates"
  ON public.lesson_templates FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

CREATE INDEX IF NOT EXISTS idx_lesson_templates_user_id ON public.lesson_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_templates_instrument ON public.lesson_templates(instrument);
CREATE INDEX IF NOT EXISTS idx_lesson_templates_is_system ON public.lesson_templates(is_system);
