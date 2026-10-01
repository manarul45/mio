-- ==============================================================================
-- PERBAIKAN KEAMANAN HAK AKSES ADMIN
-- Jalankan seluruh isi file ini sekali di Supabase SQL Editor.
--
-- Menutup tiga celah:
-- 1. Pendaftaran publik bisa mengirim role ADMIN lewat user_metadata.
-- 2. Email berawalan admin@ dan user_metadata.role dianggap admin.
-- 3. Pengguna bisa mengubah kolom role di profilnya sendiri.
-- ==============================================================================

-- 1. Akun baru selalu STUDENT, kecuali role diisi lewat app_metadata (kunci server).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    raw_role text := upper(btrim(COALESCE(NEW.raw_app_meta_data->>'role', '')));
    safe_role public.user_role := 'STUDENT';
    safe_email text;
    safe_name text;
    safe_wa text;
BEGIN
    IF raw_role IN ('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT') THEN
        safe_role := raw_role::public.user_role;
    END IF;

    safe_email := COALESCE(
        NULLIF(btrim(NEW.email), ''),
        NULLIF(btrim(meta->>'email'), ''),
        NEW.id::text || '@user.local'
    );
    safe_name := COALESCE(
        NULLIF(btrim(meta->>'name'), ''),
        NULLIF(btrim(meta->>'full_name'), ''),
        split_part(safe_email, '@', 1),
        'Pengguna'
    );
    safe_wa := NULLIF(left(btrim(COALESCE(meta->>'whatsapp_number', '')), 30), '');

    INSERT INTO public.profiles (id, name, email, whatsapp_number, avatar_url, role)
    VALUES (
        NEW.id,
        safe_name,
        safe_email,
        safe_wa,
        NULLIF(btrim(COALESCE(meta->>'avatar_url', '')), ''),
        safe_role
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, public.profiles.whatsapp_number),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 2. Admin hanya dari kolom role di profiles atau app_metadata.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    jwt_role TEXT := upper(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', ''));
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
    OR jwt_role IN ('ADMIN', 'SUPER_ADMIN');
END;
$$;

-- 3. Pengguna biasa tidak boleh mengubah role dirinya sendiri.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.role := 'STUDENT';
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
        NEW.role := OLD.role;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 4. Periksa daftar admin saat ini. Pastikan semuanya memang orang yang Anda kenal.
SELECT id, name, email, role, created_at
FROM public.profiles
WHERE role IN ('ADMIN', 'SUPER_ADMIN')
ORDER BY created_at;
