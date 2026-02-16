-- Security fixes: tighten RLS policies, add delete_user and data export RPCs
-- Fixes overly permissive USING (true) on classrooms, classroom_students, assignments, assignment_completions

-- =============================================================================
-- 1. Helper function: check classroom membership (SECURITY DEFINER bypasses RLS
--    to avoid infinite recursion when classroom_students policies reference themselves)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_classroom_member(p_classroom_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.classroom_students
    WHERE classroom_id = p_classroom_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_classroom_owner(p_classroom_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_classroom_id AND created_by = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- 2. Classrooms: restrict to authenticated users (was: anyone including anon)
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view classrooms" ON public.classrooms;

CREATE POLICY "Authenticated users can view classrooms"
  ON public.classrooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- 3. Classroom students: only visible to the student themselves,
--    the classroom owner, or fellow members
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view enrollments" ON public.classroom_students;

CREATE POLICY "Members and owners can view enrollments"
  ON public.classroom_students FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_classroom_owner(classroom_id, auth.uid())
    OR public.is_classroom_member(classroom_id, auth.uid())
  );

-- =============================================================================
-- 4. Assignments: only visible to classroom owners and enrolled students
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view assignments" ON public.assignments;

CREATE POLICY "Members and owners can view assignments"
  ON public.assignments FOR SELECT
  USING (
    public.is_classroom_owner(classroom_id, auth.uid())
    OR public.is_classroom_member(classroom_id, auth.uid())
  );

-- =============================================================================
-- 5. Assignment completions: own completions + classroom members can see
--    completions for their classrooms (needed for student progress views)
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view completions" ON public.assignment_completions;

CREATE POLICY "Users can view relevant completions"
  ON public.assignment_completions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_id
      AND (
        public.is_classroom_owner(a.classroom_id, auth.uid())
        OR public.is_classroom_member(a.classroom_id, auth.uid())
      )
    )
  );

-- =============================================================================
-- 6. delete_user RPC — called from AuthContext.tsx deleteAccount()
--    Deletes all user data and the auth.users row
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void AS $$
BEGIN
  -- Verify the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete user data (order matters for foreign keys, though CASCADE helps)
  DELETE FROM public.assignment_completions WHERE user_id = auth.uid();
  DELETE FROM public.classroom_students WHERE user_id = auth.uid();
  DELETE FROM public.push_tokens WHERE user_id = auth.uid();
  DELETE FROM public.practice_sessions WHERE user_id = auth.uid();
  -- Delete classrooms owned by the user (cascades to assignments, students, completions)
  DELETE FROM public.classrooms WHERE created_by = auth.uid();
  -- Delete profile
  DELETE FROM public.profiles WHERE id = auth.uid();
  -- Delete the auth user
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. get_user_data_export RPC — GDPR data portability (right to data export)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_data_export()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT row_to_json(p)
      FROM public.profiles p
      WHERE p.id = auth.uid()
    ),
    'practice_sessions', (
      SELECT COALESCE(jsonb_agg(row_to_json(ps)), '[]'::jsonb)
      FROM public.practice_sessions ps
      WHERE ps.user_id = auth.uid()
    ),
    'assignment_completions', (
      SELECT COALESCE(jsonb_agg(row_to_json(ac)), '[]'::jsonb)
      FROM public.assignment_completions ac
      WHERE ac.user_id = auth.uid()
    ),
    'classroom_memberships', (
      SELECT COALESCE(jsonb_agg(row_to_json(cs)), '[]'::jsonb)
      FROM public.classroom_students cs
      WHERE cs.user_id = auth.uid()
    ),
    'owned_classrooms', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM public.classrooms c
      WHERE c.created_by = auth.uid()
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
