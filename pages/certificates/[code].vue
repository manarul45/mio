<script setup lang="ts">
import { ref } from 'vue'
import {
  Award,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  Printer,
  ShieldCheck,
  ArrowLeft
} from 'lucide-vue-next'
import type { Certificate } from '~/types/database.types'

const route = useRoute()
const supabase = useSupabaseClient()
const code = route.params.code as string

const { data: cert, error } = await useAsyncData(`cert_${code}`, async () => {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:profiles!certificates_user_id_fkey(name, email),
      course:courses(title, description, instructor:profiles!courses_instructor_id_fkey(name))
    `)
    .eq('certificate_code', code)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Sertifikat tidak ditemukan atau tidak valid.' })
  return data as Certificate
})

const printCertificate = () => {
  window.print()
}

useHead({
  title: computed(() => `Verifikasi Sertifikat #${code} — MIO Learning Academy`)
})
</script>

<template>
  <div v-if="cert" class="py-12 bg-slate-100 min-h-screen">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Actions top bar -->
      <div class="flex items-center justify-between mb-6 print:hidden">
        <NuxtLink to="/" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600">
          <ArrowLeft class="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </NuxtLink>

        <button
          @click="printCertificate"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-sm"
        >
          <Printer class="w-4 h-4" />
          <span>Cetak / Unduh PDF</span>
        </button>
      </div>

      <!-- Certificate Visual Container -->
      <div class="bg-white rounded-3xl p-8 sm:p-14 border-8 border-indigo-50 shadow-2xl relative overflow-hidden text-center space-y-8">
        <!-- Watermark / Stamp -->
        <div class="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-indigo-50/50 pointer-events-none"></div>

        <!-- Header -->
        <div class="space-y-3">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
            <ShieldCheck class="w-4 h-4 text-emerald-600" />
            <span>Sertifikat Digital Terverifikasi Resmi</span>
          </div>

          <div class="pt-2">
            <img
              src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
              alt="MIO Academy"
              class="h-16 w-16 mx-auto object-contain mb-2"
            />
            <h2 class="text-xs uppercase tracking-widest text-slate-400 font-bold">MIO Learning Academy</h2>
            <h1 class="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1 font-serif">
              SERTIFIKAT KELULUSAN
            </h1>
          </div>
        </div>

        <!-- Recipient -->
        <div class="py-4 space-y-2 border-y border-slate-100">
          <p class="text-xs uppercase tracking-wider text-slate-500">Diberikan Kepada:</p>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-indigo-700 font-serif">
            {{ cert.user?.name }}
          </h2>
          <p class="text-xs text-slate-500 max-w-lg mx-auto">
            Atas dedikasi dan keberhasilannya dalam menyelesaikan seluruh rangkaian materi, praktik, dan kuis evaluasi pada program:
          </p>
          <h3 class="text-lg sm:text-xl font-bold text-slate-900 pt-2">
            {{ cert.course?.title }}
          </h3>
        </div>

        <!-- Footer Credential Details -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-left text-xs">
          <div class="p-3 bg-slate-50 rounded-xl">
            <p class="text-[11px] text-slate-400 font-semibold uppercase">Nomor Sertifikat</p>
            <p class="font-mono font-bold text-slate-800 mt-0.5">{{ cert.certificate_code }}</p>
          </div>

          <div class="p-3 bg-slate-50 rounded-xl">
            <p class="text-[11px] text-slate-400 font-semibold uppercase">Tanggal Diterbitkan</p>
            <p class="font-semibold text-slate-800 mt-0.5">{{ new Date(cert.issued_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
          </div>

          <div class="p-3 bg-slate-50 rounded-xl">
            <p class="text-[11px] text-slate-400 font-semibold uppercase">Instruktur Pengampu</p>
            <p class="font-semibold text-slate-800 mt-0.5">{{ cert.course?.instructor?.name || 'MIO Instructor Team' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
