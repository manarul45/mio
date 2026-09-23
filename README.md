# 🎓 MIO Learning Academy

Platform pembelajaran online islami modern berbasis **Nuxt 3 / 4**, **Vue 3**, **Tailwind CSS**, dan **Supabase PostgreSQL**. Proyek ini merupakan implementasi penuh berkinerja tinggi yang di-porting dari aplikasi referensi Laravel Inertia (`appmio`).

---

## 🚀 Panduan Memulai Cepat (*Quick Start for Developers*)

Bagi developer baru yang menerima proyek ini, ikuti langkah-langkah berikut untuk langsung menjalankan aplikasi di komputer lokal:

### 1. Prasyarat Sistem
- **Node.js**: Versi `18.x`, `20.x`, atau `22.x` (Direkomendasikan v20 LTS ke atas).
- **Package Manager**: `npm`, `pnpm`, atau `yarn`.
- **Akun Supabase**: Proyek database Supabase aktif (gratis di [supabase.com](https://supabase.com)).

### 2. Instalasi Dependensi
Clone repository ke komputer lokal, buka terminal di folder proyek, lalu jalankan:

```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file template `.env.example` menjadi `.env`:

```bash
# Windows PowerShell
copy .env.example .env

# Linux / macOS / Git Bash
cp .env.example .env
```

Buka file `.env` dan isi kredensial dari dashboard Supabase Anda (**Project Settings -> API**):

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **PENTING:** `SUPABASE_SERVICE_ROLE_KEY` wajib diisi agar fungsi administrasi backend (seperti import database SQL, bypassing RLS untuk sinkronisasi kurikulum) dapat berjalan lancar.

### 4. Setup Database Supabase (Jika Menggunakan Database Baru)
Jika menggunakan proyek Supabase baru yang masih kosong:
1. Buka dashboard Supabase -> pilih menu **SQL Editor**.
2. Buka file [`supabase/schema.sql`](./supabase/schema.sql) di proyek ini, salin seluruh kodenya, dan tempelkan ke SQL Editor Supabase, lalu klik **Run**.
3. File tersebut otomatis membuat:
   - Seluruh tabel database (kursus, modul, pelajaran, kuis, order, voucher, dll).
   - Ekstensi UUID & pgcrypto.
   - Triggers otomatis pembuatan profil user (`handle_new_user`).
   - Aturan keamanan **Row Level Security (RLS)** lengkap.
   - Storage buckets (`courses`, `avatars`, `certificates`, dll).

### 5. Menjalankan Server Development
Jalankan perintah berikut:

```bash
npm run dev
```

Buka browser di [http://localhost:3000](http://localhost:3000). Aplikasi siap digunakan!

---

## 👑 Hak Akses Administrator & Akun Demo

Sistem ini memiliki middleware otorisasi berbasis peran (*Role-Based Access Control*):
- `SUPER_ADMIN` / `ADMIN`: Mengelola moderasi kursus, database, kategori, voucher, template WhatsApp, dan pengaturan sistem.
- `INSTRUCTOR`: Mengelola kursus buatan sendiri, studio silabus video & kuis, analitik pendapatan.
- `STUDENT`: Mengakses kelas yang dibeli, menonton video, mengerjakan kuis, klaim sertifikat.

### Cara Membuat Akun Admin:
1. Buka [http://localhost:3000/register](http://localhost:3000/register) dan daftarkan akun baru dengan email admin (misal: `admin@mioacademy.com` atau email Anda).
2. Sistem secara otomatis mengenali email berawalan `admin@` atau `admin@mioacademy.com` dan memberikan hak akses Admin.
3. Atau, jalankan query berikut di **Supabase SQL Editor**:
   ```sql
   UPDATE public.profiles SET role = 'ADMIN' WHERE email = 'email-anda@domain.com';
   ```

---

## 💾 Fasilitas Impor & Backup Database

Aplikasi dilengkapi modul pemulihan dan migrasi database terpadu:
- Kunjungi menu **Administrator -> Database** di [http://localhost:3000/admin/database](http://localhost:3000/admin/database).
- Anda dapat mengunggah file backup MySQL dump (`.sql` atau `.json`).
- Parser internal berkecepatan tinggi (`server/utils/mysqlParser.ts`) akan otomatis memetakan relasi kursus, ribuan materi video, kuis, soal, dan opsi jawaban ke PostgreSQL Supabase dalam hitungan detik.

---

## 📁 Struktur Direktori Proyek

```text
├── assets/                  # CSS global (Tailwind CSS, font Figtree)
├── components/              # Komponen Vue reusable
│   ├── ApplicationLogo.vue  # Logo resmi MIO Academy
│   └── UI/                  # Komponen UI atomik (Button, Modal, Input, Badge, Table, dll.)
├── composables/             # State & Logic composables
│   ├── useAuthProfile.ts    # Otentikasi, deteksi hak akses role, profil user
│   ├── useSwal.ts           # Notifikasi dialog SweetAlert2 Tailwind theme
│   └── useToast.ts          # Event emitter toast notifikasi
├── layouts/                 # Layout halaman
│   ├── default.vue          # Layout umum publik (Navbar + Footer)
│   └── dashboard.vue        # Layout dashboard (Sidebar navigasi dinamis per role)
├── middleware/              # Router guards (auth.ts, admin.ts)
├── pages/                   # File-based routing Nuxt
│   ├── index.vue            # Halaman Beranda / Welcome
│   ├── login/ & register/   # Autentikasi Pengguna
│   ├── courses/             # Katalog & Detail Kursus Publik
│   ├── checkout/ & orders/  # Alur Transaksi, Pembayaran Bank, & Invoice
│   ├── dashboard/           # Ringkasan Dasbor Siswa / Admin
│   ├── my-courses/          # Daftar Kursus yang Diikuti Siswa
│   ├── learning/            # Classroom Player Video & Solver Kuis Interaktif
│   ├── instructor/          # Studio Instruktur (Manajemen Kursus, Builder Kurikulum)
│   └── admin/               # Panel Administrator (Database, Finance, Vouchers, Users, dll.)
├── server/                  # Backend API Nitro routes
│   ├── api/admin/           # Endpoint Admin (Import SQL, Database stats)
│   ├── api/checkout/        # Endpoint Transaksi & Voucher
│   └── utils/               # MySQL Tokenizer Parser
├── supabase/                # Skrip database
│   ├── schema.sql           # Skema lengkap PostgreSQL, triggers, & RLS policies
│   └── seed_admin.sql       # Skrip pengangkatan akun admin
├── nuxt.config.ts           # Konfigurasi Nuxt, Tailwind, & Supabase Module
└── package.json             # Dependensi & script proyek
```

---

## 🛠️ Perintah Berguna (*NPM Scripts*)

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan local dev server dengan Hot Module Replacement (HMR). |
| `npm run build` | Melakukan kompilasi produksi (Vite client + Nitro server engine). |
| `npm run preview` | Menjalankan preview lokal dari hasil kompilasi produksi. |

---

## 🚢 Deployment ke Hosting / Vercel

Proyek ini menggunakan Nitro engine dengan preset `vercel`:
1. Push repository ke GitHub / GitLab.
2. Impor proyek di [Vercel](https://vercel.com).
3. Masukkan **Environment Variables** di Vercel Settings:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Klik **Deploy**. Aplikasi akan otomatis online dalam hitungan detik.
