<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '~/composables/useToast'
import {
  BookOpen,
  GraduationCap,
  Video,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Users,
  MessageSquare,
  Play,
  CheckCircle2,
  Award,
  HelpCircle,
  ArrowRight,
  Coins,
  Layers,
  FileText,
  Copy,
  Check,
} from 'lucide-vue-next'

useHead({
  title: 'Pusat Panduan & Tutorial — MIO Learning Academy',
  meta: [
    { name: 'description', content: 'Panduan lengkap penggunaan sistem MIO Learning Academy untuk Siswa, Instruktur, dan Administrator.' }
  ]
})

const toast = useToast()
const activeCategory = ref('quickstart')
const copiedText = ref('')

const copySnippet = (text: string) => {
  navigator.clipboard.writeText(text)
  copiedText.value = text
  toast.success('Snippet berhasil disalin ke clipboard!')
  setTimeout(() => {
    copiedText.value = ''
  }, 2000)
}

const categories = [
  { id: 'quickstart', name: 'Alur Cepat (Overview)', icon: Sparkles },
  { id: 'student', name: 'Panduan Siswa', icon: GraduationCap },
  { id: 'instructor', name: 'Panduan Instruktur', icon: Video },
  { id: 'admin', name: 'Panduan Administrator', icon: ShieldCheck },
  { id: 'shortcodes', name: 'Panduan Shortcodes', icon: Layers },
  { id: 'faq', name: 'FAQ & Tanya Jawab', icon: HelpCircle },
]

const shortcodeExamples = {
  course: '{{course_title}} | {{course_price}} | {{course_url}}',
  instructor: '{{instructor_name}} | {{instructor_avatar}} | {{instructor_bio}}',
  stats: '[stats_overview]',
  whatsapp: '[whatsapp_button label="Konsultasi via WhatsApp"]',
}
</script>


<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
    <!-- Header Banner -->
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-16 text-white border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div class="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-4 py-1 text-xs font-bold text-indigo-300 backdrop-blur-md">
          <BookOpen class="h-4 w-4 text-indigo-400" />
          <span>Pusat Bantuan & Tutorial Lengkap</span>
        </div>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
          Panduan Penggunaan Sistem <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">MIO Learning Academy</span>
        </h1>
        <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Panduan terstruktur langkah demi langkah untuk Siswa, Instruktur, dan Administrator dalam mengoperasikan seluruh fitur platform.
        </p>

        <!-- Quick Navigation Tabs -->
        <div class="pt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            @click="activeCategory = cat.id"
            :class="[
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80',
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all'
            ]"
          >
            <component :is="cat.icon" class="h-4 w-4" />
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- ========================================== -->
      <!-- 1. QUICKSTART OVERVIEW                     -->
      <!-- ========================================== -->
      <div v-show="activeCategory === 'quickstart'" class="space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Alur Kerja Utama Platform
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Memahami interaksi 3 peran pengguna di dalam ekosistem pembelajaran MIO Learning Academy.
          </p>
        </div>

        <!-- 3 Roles Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Card 1: Siswa -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div class="space-y-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <GraduationCap class="h-6 w-6" />
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Peran Siswa (Student)</h3>
              <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Mendaftar akun dan membeli kursus via transfer bank manual atau payment gateway.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Menonton materi video responsif & memantau progres belajar otomatis.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Mengerjakan kuis evaluasi, berdiskusi di Q&A kelas, dan mengunduh sertifikat resmi.</span>
                </li>
              </ul>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button @click="activeCategory = 'student'" class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                <span>Buka Panduan Siswa</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- Card 2: Instruktur -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div class="space-y-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <Video class="h-6 w-6" />
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Peran Instruktur (Instructor)</h3>
              <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>Membuat kursus baru, harga, dan materi modul/section dengan drag-and-drop.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>Memasukkan video YouTube pembelajaran & file aset unduhan materi.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>Membuat soal kuis pilihan ganda dan menjawab tanya-jawab siswa di kelas.</span>
                </li>
              </ul>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button @click="activeCategory = 'instructor'" class="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700">
                <span>Buka Panduan Instruktur</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- Card 3: Administrator -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div class="space-y-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <ShieldCheck class="h-6 w-6" />
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Peran Administrator (Admin)</h3>
              <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Memantau omset penjualan dan approve pembayaran transfer bank & penarikan komisi afiliasi.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Manajemen pengguna, impor massal (bulk import), dan reset password via WhatsApp.</span>
                </li>
                <li class="flex items-start gap-2">
                  <CheckCircle2 class="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Kustomisasi landing page beranda, audit trail logs, dan shortcode engine.</span>
                </li>
              </ul>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button @click="activeCategory = 'admin'" class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                <span>Buka Panduan Admin</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Visual Step Flow Mockup -->
        <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles class="h-5 w-5 text-indigo-600" />
            <span>Alur Pembelian Hingga Kelulusan Sertifikat</span>
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div class="rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 space-y-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">1</span>
              <h4 class="text-xs font-bold text-slate-900 dark:text-white">Pilih & Beli Kursus</h4>
              <p class="text-[11px] text-slate-500">Siswa memilih kursus di katalog dan mengisi formulir checkout (nama, WA, email).</p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 space-y-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">2</span>
              <h4 class="text-xs font-bold text-slate-900 dark:text-white">Konfirmasi Bayar</h4>
              <p class="text-[11px] text-slate-500">Kirim bukti bayar via 1-click WhatsApp. Admin melakukan approval di panel finance.</p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 space-y-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">3</span>
              <h4 class="text-xs font-bold text-slate-900 dark:text-white">Belajar & Kuis</h4>
              <p class="text-[11px] text-slate-500">Tonton materi video, unduh aset pendukung, dan selesaikan kuis dengan skor kelulusan.</p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 space-y-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">4</span>
              <h4 class="text-xs font-bold text-slate-900 dark:text-white">Klaim Sertifikat</h4>
              <p class="text-[11px] text-slate-500">Otomatis terbit sertifikat digital resmi dengan token kode verifikasi unik publik.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 2. STUDENT GUIDE                           -->
      <!-- ========================================== -->
      <div v-show="activeCategory === 'student'" class="space-y-8">
        <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
            Panduan Lengkap Siswa (Student Guide)
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Langkah detail mulai dari pendaftaran, proses pembayaran, belajar video interaktif, hingga penerbitan sertifikat.
          </p>
        </div>

        <!-- Section: Checkout & Pembayaran -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <CreditCard class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">1. Cara Membeli Kursus (Checkout)</h3>
              <p class="text-xs text-slate-500">Bisa dilakukan oleh pengguna baru (Guest) maupun yang sudah login.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2 border border-slate-100 dark:border-slate-800">
              <span class="font-bold text-indigo-600 dark:text-indigo-400">Langkah 1: Isi Formulir</span>
              <p>Buka halaman detail kursus, lalu klik tombol <strong>Daftar Kursus Sekarang</strong>. Isi Nama Lengkap, Nomor WhatsApp aktif (format: 08xx / 628xx), dan Kata Sandi.</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2 border border-slate-100 dark:border-slate-800">
              <span class="font-bold text-indigo-600 dark:text-indigo-400">Langkah 2: Transfer Pembayaran</span>
              <p>Sistem akan menampilkan <strong>Nomor Invoice</strong> dan instruksi transfer rekening bank resmi. Nominal harus sesuai dengan total invoice.</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-2 border border-slate-100 dark:border-slate-800">
              <span class="font-bold text-indigo-600 dark:text-indigo-400">Langkah 3: Kirim Bukti WA</span>
              <p>Klik tombol hijau <strong>Konfirmasi Pembayaran via WhatsApp</strong>. Pesan tagihan sudah otomatis terisi dan siap dikirim ke Admin.</p>
            </div>
          </div>
        </div>

        <!-- Section: Belajar & Kuis -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Play class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">2. Ruang Belajar & Evaluasi Kuis</h3>
              <p class="text-xs text-slate-500">Akses materi video pembelajaran dan kerjakan kuis kelulusan.</p>
            </div>
          </div>

          <div class="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <CheckCircle2 class="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong class="text-slate-900 dark:text-white block mb-1">Tandai Selesai & Lacak Progres:</strong>
                Di bawah pemutar video materi, klik tombol <strong>Tandai Selesai</strong> untuk mencatat progres belajar Anda. Bilah progres di samping kiri akan otomatis bertambah secara realtime.
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
              <Award class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong class="text-slate-900 dark:text-white block mb-1">Ketentuan Kelulusan Kuis:</strong>
                Setiap kuis memiliki standar nilai kelulusan (*Passing Score*, misal 80%). Jawaban dievaluasi secara aman langsung di server. Jika belum lulus, siswa dapat mengulang kuis kapan saja.
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Sertifikat -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <GraduationCap class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">3. Mengklaim & Memverifikasi Sertifikat</h3>
              <p class="text-xs text-slate-500">Mendapatkan sertifikat resmi berlisensi setelah lulus 100%.</p>
            </div>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Setelah seluruh video dan kuis berstatus selesai (progres 100%), sertifikat digital akan otomatis terbit. Anda dapat melihatnya di menu <strong>Sertifikat Saya</strong> (`/my-certificates`). Setiap sertifikat memiliki tautan publik unik (`/certificates/KODE_SERTIFIKAT`) untuk verifikasi keaslian oleh pihak luar.
          </p>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 3. INSTRUCTOR GUIDE                        -->
      <!-- ========================================== -->
      <div v-show="activeCategory === 'instructor'" class="space-y-8">
        <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
            Panduan Instruktur (Instructor Studio)
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Cara membuat kursus, merancang kurikulum materi video YouTube, dan menyusun kuis interaktif.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Step 1: Create Course -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">1</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Membuat Informasi Kursus</h3>
            </div>
            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>• Buka <strong>Studio > Kelola Kursus > Buat Kursus Baru</strong>.</li>
              <li>• Tentukan Judul Kursus, Subtitle singkat, Kategori, dan Tingkat Kesulitan (*Beginner / Intermediate / Advanced*).</li>
              <li>• Atur Harga Normal (misal: Rp 250.000) dan Harga Diskon Promo (misal: Rp 150.000).</li>
              <li>• Unggah foto thumbnail berkualitas tinggi (rekomendasi rasio 16:9).</li>
            </ul>
          </div>

          <!-- Step 2: Curriculum Structure -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">2</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Menyusun Modul & Video</h3>
            </div>
            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>• Tambahkan <strong>Modul / Section</strong> (contoh: <em>Modul 1: Kaidah Fiqih</em>).</li>
              <li>• Di dalam modul, klik <strong>+ Tambah Materi Lesson</strong>.</li>
              <li>• Masukkan ID Video YouTube (contoh: <code>dQw4w9WgXcQ</code> atau link YouTube). Video dapat diatur <em>Unlisted</em> di YouTube.</li>
              <li>• Durasi dan preview video terdeteksi otomatis.</li>
            </ul>
          </div>

          <!-- Step 3: Quizzes -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">3</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Membuat Kuis & Soal</h3>
            </div>
            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>• Di dalam modul, klik <strong>+ Tambah Kuis</strong>.</li>
              <li>• Tentukan Nilai Kelulusan (*Passing Score*, misal 75 atau 80).</li>
              <li>• Tuliskan pertanyaan soal, dan buat opsi pilihan ganda (A, B, C, D).</li>
              <li>• Centang radio button pada opsi yang menjadi kunci jawaban yang benar.</li>
            </ul>
          </div>

          <!-- Step 4: Publish -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs">4</span>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Publikasi & Diskusi Siswa</h3>
            </div>
            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>• Ubah status kursus menjadi <strong>Published</strong> agar langsung tayang di katalog.</li>
              <li>• Pantau pertanyaan siswa di tab diskusi kelas dan berikan tanggapan instruktur resmi.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 4. ADMIN GUIDE                             -->
      <!-- ========================================== -->
      <div v-show="activeCategory === 'admin'" class="space-y-8">
        <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
            Panduan Administrator (Admin Control Center)
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Pengelolaan transaksi keuangan, penarikan afiliasi, batch import pengguna, dan audit trails.
          </p>
        </div>

        <!-- Admin Action 1: Finance Approval -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CreditCard class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">1. Verifikasi Pembayaran & Penarikan Afiliasi</h3>
              <p class="text-xs text-slate-500">Menu: <code>Admin > Keuangan</code> & <code>Admin > Penarikan Afiliasi</code></p>
            </div>
          </div>
          <div class="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>1. Buka halaman <strong>Keuangan</strong>. Pesanan baru yang belum dikonfirmasi berstatus <strong>Menunggu Approval</strong>.</p>
            <p>2. Cocokkan mutasi bank Anda dengan nomor invoice dan nominal pesanan.</p>
            <p>3. Di menu <strong>Penarikan Afiliasi</strong>, verifikasi rekening bank member, transfer dana, dan klik <strong>Approve & Upload Bukti</strong>.</p>
          </div>
        </div>

        <!-- Admin Action 2: Batch User Import -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Users class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">2. Import Pengguna Massal & Reset Password WA</h3>
              <p class="text-xs text-slate-500">Menu: <code>Admin > Pengguna</code> (<code>/admin/users</code>)</p>
            </div>
          </div>
          <div class="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>Anda dapat mengimpor hingga ratusan pengguna sekaligus dengan format CSV/JSON per baris:</p>
            <code class="block rounded-xl bg-slate-100 p-3 font-mono text-[11px] text-indigo-700 dark:bg-slate-800 dark:text-indigo-300">
              Ahmad Fauzi, ahmad@gmail.com, 08123456789, STUDENT, Rahasia123<br>
              Budi Santoso, budi@gmail.com, 08198765432, INSTRUCTOR, PasswordBudi
            </code>
            <p class="text-slate-500 text-[11px]">Gunakan tombol <strong>Reset WA</strong> untuk mereset kata sandi dan langsung membuka obrolan WhatsApp dengan kata sandi baru yang siap dikirimkan.</p>
          </div>
        </div>

        <!-- Admin Action 3: Landing Page Editor -->
        <div class="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Layers class="h-5 w-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">3. Kelola Landing Page & Audit Logs</h3>
              <p class="text-xs text-slate-500">Menu: <code>Admin > Landing Pages</code> & <code>Admin > Log Audit</code></p>
            </div>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Gunakan <strong>Landing Page System</strong> untuk membuat halaman promosi kustom dengan dynamic shortcodes, atau atur halaman promosi sebagai beranda utama (<code>/</code>). Setiap aksi penting terekam aman di <strong>Log Audit</strong>.
          </p>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 5. SHORTCODES CHEATSHEET                   -->
      <!-- ========================================== -->
      <div v-show="activeCategory === 'shortcodes'" class="space-y-8">
        <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
            Daftar Shortcode Dinamis (Shortcode Engine)
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Tag pintar yang bisa disisipkan pada Code Editor Landing Page untuk menampilkan data dan komponen interaktif.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- SC 1: Course Title -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">1. Data Kursus Dinamis</h3>
              <button
                type="button"
                @click="copySnippet(shortcodeExamples.course)"
                class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Copy class="h-3.5 w-3.5" />
                <span>Salin</span>
              </button>
            </div>
            <code v-pre class="block rounded-xl bg-slate-100 p-2.5 font-mono text-xs text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 select-all">
              {{course_title}} | {{course_price}} | {{course_url}}
            </code>
            <p class="text-xs text-slate-500 leading-relaxed">
              Otomatis mengganti judul kursus, harga berformat Rupiah, dan URL checkout kursus yang dipilih.
            </p>
          </div>

          <!-- SC 2: Instructor Info -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">2. Profil Instruktur</h3>
              <button
                type="button"
                @click="copySnippet(shortcodeExamples.instructor)"
                class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Copy class="h-3.5 w-3.5" />
                <span>Salin</span>
              </button>
            </div>
            <code v-pre class="block rounded-xl bg-slate-100 p-2.5 font-mono text-xs text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 select-all">
              {{instructor_name}} | {{instructor_avatar}} | {{instructor_bio}}
            </code>
            <p class="text-xs text-slate-500 leading-relaxed">
              Menampilkan nama instruktur ahli, foto avatar, dan ringkasan bio/latar belakang pendidik.
            </p>
          </div>

          <!-- SC 3: Stats Overview -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">3. Counter Statistik Live</h3>
              <button
                type="button"
                @click="copySnippet(shortcodeExamples.stats)"
                class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Copy class="h-3.5 w-3.5" />
                <span>Salin</span>
              </button>
            </div>
            <code class="block rounded-xl bg-slate-100 p-2.5 font-mono text-xs text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 select-all">
              [stats_overview]
            </code>
            <p class="text-xs text-slate-500 leading-relaxed">
              Menampilkan 4 kartu statistik pencapaian platform: Santri, Kitab & Materi, Sertifikat Resmi, dan Kepuasan Belajar.
            </p>
          </div>

          <!-- SC 4: WhatsApp CTA -->
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">4. Tombol Chat WhatsApp</h3>
              <button
                type="button"
                @click="copySnippet(shortcodeExamples.whatsapp)"
                class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Copy class="h-3.5 w-3.5" />
                <span>Salin</span>
              </button>
            </div>
            <code class="block rounded-xl bg-slate-100 p-2.5 font-mono text-xs text-indigo-700 dark:bg-slate-800 dark:text-indigo-300 select-all">
              [whatsapp_button label="Konsultasi via WhatsApp"]
            </code>
            <p class="text-xs text-slate-500 leading-relaxed">
              Menyisipkan tombol hijau WhatsApp yang langsung membuka obrolan ke nomor CS/Admin platform.
            </p>
          </div>
        </div>
      </div>


      <!-- ========================================== -->
      <!-- 6. FAQ SECTION                             -->
      <!-- ========================================== -->
      <div v-show="activeCategory === 'faq'" class="space-y-6">
        <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
            Pertanyaan Umum (Frequently Asked Questions)
          </h2>
          <p class="text-xs sm:text-sm text-slate-500">
            Jawaban untuk kendala dan pertanyaan yang sering diajukan seputar aplikasi.
          </p>
        </div>

        <div class="space-y-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Q: Apakah video materi kursus bisa diunduh atau bocor ke publik?
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              A: Materi video diintegrasikan melalui YouTube Player terproteksi dan hanya dapat diakses oleh siswa yang telah memiliki status pendaftaran (<em>Enrolled</em>) aktif di kursus tersebut.
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Q: Bagaimana jika siswa lupa kata sandi akunnya?
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              A: Siswa dapat menggunakan fitur <strong>Lupa Kata Sandi</strong> di halaman login, atau Administrator dapat mereset kata sandi siswa secara langsung melalui tombol <strong>Reset WA</strong> di menu <strong>Admin > Pengguna</strong>.
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Q: Apakah sertifikat yang terbit dapat dipalsukan?
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              A: Tidak. Setiap sertifikat memiliki kode sertifikat unik permanen (contoh: <code>MIO-CERT-XXXX</code>) yang tercatat di database dan dapat diverifikasi keasliannya secara publik melalui halaman verifikasi resmi.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
