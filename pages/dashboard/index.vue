<script setup lang="ts">
import { ref } from 'vue'
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Play,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Shield,
  Database
} from 'lucide-vue-next'
import type { Enrollment, Certificate, Order } from '~/types/database.types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const { user, profile, isAdmin, isInstructor } = useAuthProfile()
const activeTab = ref<'courses' | 'certificates' | 'orders'>('courses')

// Fetch student enrollments
const { data: enrollments, refresh: refreshEnrollments } = await useAsyncData('student_enrollments', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(
        id, title, slug, subtitle, thumbnail_url,
        sections:course_sections(
          id,
          lessons:lessons(id)
        )
      )
    `)
    .eq('user_id', user.value.id)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  return (data || []) as Enrollment[]
})

// Fetch student certificates
const { data: certificates } = await useAsyncData('student_certificates', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('certificates')
    .select(`
      *,
      course:courses(id, title, slug, thumbnail_url)
    `)
    .eq('user_id', user.value.id)
    .order('issued_at', { ascending: false })

  return (data || []) as Certificate[]
})

// Fetch student orders
const { data: orders } = await useAsyncData('student_orders', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false })

  return (data || []) as Order[]
})

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0)
}

useHead({
  title: 'Dashboard Belajar — MIO Learning Academy'
})
</script>

<template>
  <div class="py-10 bg-slate-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Welcome Header -->
      <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-indigo-100 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <span v-if="isAdmin" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/40 text-purple-100 text-xs font-bold mb-2">
            <Shield class="w-3.5 h-3.5" />
            <span>PORTAL ADMINISTRATOR</span>
          </span>
          <span v-else-if="isInstructor" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/40 text-indigo-100 text-xs font-bold mb-2">
            <GraduationCap class="w-3.5 h-3.5" />
            <span>PORTAL INSTRUKTUR</span>
          </span>
          <span v-else class="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-2">
            Area Siswa
          </span>

          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {{ profile?.name || user?.email?.split('@')[0] }}!
          </h1>
          <p class="text-indigo-100 text-sm mt-1 max-w-xl">
            {{ isAdmin ? 'Anda memiliki hak akses Administrator penuh untuk mengelola platform, moderasi kursus, dan import database.' : 'Lanjutkan progres pembelajaran Anda dan raih sertifikat kompetensi hari ini.' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2.5 items-center self-start lg:self-auto">
          <NuxtLink
            v-if="isAdmin"
            to="/admin/import"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-md transition"
          >
            <Database class="w-4 h-4" />
            <span>Import Database SQL</span>
          </NuxtLink>

          <NuxtLink
            v-if="isAdmin"
            to="/admin/moderation"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition"
          >
            <Shield class="w-4 h-4" />
            <span>Moderasi Kursus</span>
          </NuxtLink>

          <NuxtLink
            to="/courses"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 shadow-md transition"
          >
            <BookOpen class="w-4 h-4" />
            <span>Katalog Kursus</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-200 mb-8">
        <button
          @click="activeTab = 'courses'"
          :class="[
            'flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition',
            activeTab === 'courses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          <GraduationCap class="w-4 h-4" />
          <span>Kursus Saya ({{ enrollments?.length || 0 }})</span>
        </button>

        <button
          @click="activeTab = 'certificates'"
          :class="[
            'flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition',
            activeTab === 'certificates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          <Award class="w-4 h-4" />
          <span>Sertifikat ({{ certificates?.length || 0 }})</span>
        </button>

        <button
          @click="activeTab = 'orders'"
          :class="[
            'flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition',
            activeTab === 'orders'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          <Receipt class="w-4 h-4" />
          <span>Riwayat Pesanan ({{ orders?.length || 0 }})</span>
        </button>
      </div>

      <!-- TAB 1: Enrolled Courses -->
      <div v-if="activeTab === 'courses'">
        <div v-if="enrollments && enrollments.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="en in enrollments"
            :key="en.id"
            class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div class="relative aspect-video overflow-hidden bg-slate-100">
                <img
                  :src="en.course?.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'"
                  :alt="en.course?.title"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="p-5">
                <h3 class="font-bold text-slate-900 text-base line-clamp-2">{{ en.course?.title }}</h3>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ en.course?.subtitle }}</p>
              </div>
            </div>

            <div class="p-5 pt-0">
              <NuxtLink
                :to="`/learning/${en.course?.slug}`"
                class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
              >
                <Play class="w-3.5 h-3.5" />
                <span>Mulai / Lanjut Belajar</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <GraduationCap class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 class="text-base font-bold text-slate-700">Anda belum terdaftar di kursus apa pun</h3>
          <p class="text-xs text-slate-500 mt-1">Eksplorasi kursus menarik dan mulailah belajar sekarang.</p>
          <NuxtLink
            to="/courses"
            class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
          >
            <span>Jelajahi Katalog Kursus</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>

      <!-- TAB 2: Certificates -->
      <div v-else-if="activeTab === 'certificates'">
        <div v-if="certificates && certificates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="cert in certificates"
            :key="cert.id"
            class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div class="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-sm">{{ cert.course?.title }}</h3>
              <p class="text-xs text-slate-500 font-mono mt-1">No: {{ cert.certificate_code }}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Diterbitkan: {{ new Date(cert.issued_at).toLocaleDateString('id-ID') }}</p>
            </div>
            <NuxtLink
              :to="`/certificates/${cert.certificate_code}`"
              class="block w-full text-center py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Lihat Sertifikat Publik
            </NuxtLink>
          </div>
        </div>

        <div v-else class="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Award class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 class="text-base font-bold text-slate-700">Belum ada sertifikat yang diraih</h3>
          <p class="text-xs text-slate-500 mt-1">Selesaikan seluruh materi pelajaran dan kuis untuk mendapatkan sertifikat resmi.</p>
        </div>
      </div>

      <!-- TAB 3: Orders -->
      <div v-else-if="activeTab === 'orders'">
        <div v-if="orders && orders.length > 0" class="space-y-4">
          <div
            v-for="ord in orders"
            :key="ord.id"
            class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div class="flex items-center gap-3">
                <span class="font-mono font-bold text-sm text-slate-900">{{ ord.order_number }}</span>
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    ord.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  ]"
                >
                  {{ ord.status }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Tanggal: {{ new Date(ord.created_at).toLocaleDateString('id-ID') }} • Total: <span class="font-semibold text-indigo-600">{{ formatCurrency(ord.final_amount) }}</span>
              </p>
            </div>

            <NuxtLink
              :to="`/orders/${ord.order_number}`"
              class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition self-start sm:self-auto"
            >
              Detail Pesanan
            </NuxtLink>
          </div>
        </div>

        <div v-else class="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Receipt class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 class="text-base font-bold text-slate-700">Belum ada riwayat pesanan</h3>
        </div>
      </div>
    </div>
  </div>
</template>
