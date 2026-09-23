-- ==============================================================================
-- CARA MEMBUAT ATAU MENGANGKAT AKUN ADMIN DI SUPABASE SQL EDITOR
-- ==============================================================================

-- CARA 1: Jika Anda sudah mendaftar di halaman /register dengan email Anda,
-- jalankan query berikut untuk mengubah role akun Anda menjadi ADMIN:
UPDATE public.profiles
SET role = 'ADMIN'
WHERE email = 'admin@mioacademy.com'; -- Ganti dengan email Anda yang terdaftar!

-- Verifikasi akun admin:
SELECT id, name, email, role FROM public.profiles WHERE role = 'ADMIN';
