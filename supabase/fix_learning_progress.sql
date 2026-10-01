-- ==============================================================================
-- PERBAIKAN PROGRES BELAJAR & KUIS
-- Jalankan seluruh isi file ini sekali di Supabase SQL Editor.
--
-- Progres pelajaran dan hasil kuis sekarang ditulis oleh server (/api/learning/*).
-- Siswa cukup membaca datanya sendiri, supaya kelulusan tidak bisa dipalsukan.
-- ==============================================================================

DROP POLICY IF EXISTS "Users manage own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users read own progress" ON public.lesson_progress;
CREATE POLICY "Users read own progress" ON public.lesson_progress
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users read own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users read own quiz attempts" ON public.quiz_attempts
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Periksa hasilnya: seharusnya hanya ada aturan SELECT untuk siswa
-- (ditambah "Staff delete quiz attempts" untuk instruktur).
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('lesson_progress', 'quiz_attempts')
ORDER BY tablename, policyname;
