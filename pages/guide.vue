<script setup lang="ts">
import {
  HelpCircle,
  BookOpen,
  CreditCard,
  Award,
  Video,
  CheckCircle2,
  ArrowRight
} from 'lucide-vue-next'

const faqs = [
  {
    q: 'Bagaimana cara mendaftar dan mengikuti kursus di MIO Academy?',
    a: 'Pilih kursus yang Anda minati di halaman Jelajah Kursus, klik tombol Beli/Daftar Kursus, masukkan nomor WhatsApp Anda, lalu selesaikan pembayaran. Setelah konfirmasi berhasil, Anda dapat langsung mengakses kelas di Dashboard Belajar.'
  },
  {
    q: 'Apakah materi kursus dapat diakses selamanya?',
    a: 'Ya, seluruh kursus yang telah Anda beli mendapatkan akses seumur hidup (Lifetime Access) termasuk pembaruan materi kursus di masa mendatang.'
  },
  {
    q: 'Kapan saya mendapatkan sertifikat kelulusan?',
    a: 'Sertifikat resmi akan otomatis diterbitkan dan tersedia di Dashboard Belajar Anda segera setelah Anda menyelesaikan 100% video pelajaran dan lulus kuis evaluasi.'
  },
  {
    q: 'Bagaimana metode pembayaran yang tersedia?',
    a: 'Kami melayani transfer bank manual (BCA) dengan verifikasi otomatis atau konfirmasi bukti transfer via WhatsApp ke admin.'
  }
]

useHead({
  title: 'Panduan & Bantuan — MIO Learning Academy'
})
</script>

<template>
  <div class="py-12 bg-slate-50 min-h-screen">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      <!-- Title -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <HelpCircle class="w-4 h-4" />
          <span>Pusat Bantuan & Panduan</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Panduan Penggunaan Platform
        </h1>
        <p class="text-slate-600 text-sm max-w-xl mx-auto">
          Temukan panduan langkah demi langkah untuk memaksimalkan pengalaman belajar Anda di MIO Learning Academy.
        </p>
      </div>

      <!-- 3 Steps -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-3">
          <div class="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen class="w-6 h-6" />
          </div>
          <h3 class="font-bold text-slate-900 text-base">1. Pilih Kursus</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Telusuri katalog lengkap dengan beragam kurikulum yang disusun terstruktur oleh praktisi industri.
          </p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-3">
          <div class="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Video class="w-6 h-6" />
          </div>
          <h3 class="font-bold text-slate-900 text-base">2. Belajar Fleksibel</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Akses video materi berkualitas tinggi kapan pun dan di mana pun sesuai dengan kecepatan belajar Anda.
          </p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-3">
          <div class="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award class="w-6 h-6" />
          </div>
          <h3 class="font-bold text-slate-900 text-base">3. Raih Sertifikat</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Selesaikan kuis evaluasi dan peroleh sertifikat digital resmi yang dapat diverifikasi secara publik.
          </p>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <h2 class="text-xl font-bold text-slate-900">Pertanyaan yang Sering Diajukan (FAQ)</h2>
        <div class="space-y-4 divide-y divide-slate-100">
          <div v-for="(item, idx) in faqs" :key="idx" :class="idx > 0 ? 'pt-4' : ''" class="space-y-1">
            <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CheckCircle2 class="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>{{ item.q }}</span>
            </h3>
            <p class="text-xs text-slate-600 pl-6 leading-relaxed">{{ item.a }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
