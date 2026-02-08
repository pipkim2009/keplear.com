-- Push notification tokens for mobile app (Capacitor)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own push tokens
CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Notify students when a new assignment is created.
-- Uses pg_net to call the send-push Edge Function for each student in the classroom.
-- pg_net is pre-installed on Supabase and makes async HTTP calls from inside Postgres.
CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER AS $$
DECLARE
  student RECORD;
  classroom_title TEXT;
  project_url TEXT;
  anon_key TEXT;
BEGIN
  -- Get the classroom title
  SELECT title INTO classroom_title
  FROM public.classrooms WHERE id = NEW.classroom_id;

  -- Get Supabase project URL and anon key from app settings
  -- These must be set: ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
  -- ALTER DATABASE postgres SET app.supabase_anon_key = 'eyJ...';
  project_url := current_setting('app.supabase_url', true);
  anon_key := current_setting('app.supabase_anon_key', true);

  -- Skip if not configured
  IF project_url IS NULL OR anon_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Send push to each student in the classroom
  FOR student IN
    SELECT user_id FROM public.classroom_students
    WHERE classroom_id = NEW.classroom_id
  LOOP
    PERFORM net.http_post(
      url := project_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'userId', student.user_id,
        'title', 'New Assignment: ' || NEW.title,
        'body', 'A new assignment was posted in ' || classroom_title,
        'data', jsonb_build_object('route', '/classroom')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire push notification when a new assignment is inserted
DROP TRIGGER IF EXISTS on_assignment_created ON public.assignments;
CREATE TRIGGER on_assignment_created
  AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION notify_new_assignment();
