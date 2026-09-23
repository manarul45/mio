<script setup lang="ts">
import { ref } from 'vue'
import {
  GraduationCap,
  Plus,
  BookOpen,
  Eye,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next'
import type { Course } from '~/types/database.types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const { user, profile } = useAuthProfile()

const { data: courses, refresh } = await useAsyncData('instructor_courses_list', async () => {
  if (!user.value) return []
  const { data } = await supabase
    .from('courses')
    .select('*, category:categories(name)')
    .eq('instructor_id', user.value.id)
    .order('created_at', { ascending: false })

  return (data || []) as Course[]
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
  title: 'Instructor Studio — MIO Learning Academy'
})
</script>

<template>
  <div class="py-10 bg-slate-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Studio Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-1">
            <GraduationCap class="w-4 h-4" />
            <span>INSTRUCTOR STUDIO</span>
          </div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Manajemen Kursus Saya</h1>
          <p class="text-xs text-slate-500 mt-1">Kelola kurikulum, materi video, kuis, dan harga kursus Anda</p>
        </div>

        <button
          class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
        >
          <Plus class="w-4 h-4" />
          <span>Buat Kursus Baru</span>
        </button>
      </div>

      <!-- Course List -->
      <div v-if="courses && courses.length > 0" class="space-y-4">
        <div
          v-for="c in courses"
          :key="c.id"
          class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-4">
            <img
              :src="c.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop'"
              :alt="c.title"
              class="w-20 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0"
            />
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-indigo-600 uppercase">{{ c.category?.name || 'Umum' }}</span>
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    c.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  ]"
                >
                  {{ c.status }}
                </span>
              </div>
              <h3 class="text-base font-bold text-slate-900 mt-0.5">{{ c.title }}</h3>
              <p class="text-xs text-slate-500 font-semibold">{{ formatCurrency(c.price) }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-auto">
            <NuxtLink
              :to="`/courses/${c.slug}`"
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
            >
              <Eye class="w-3.5 h-3.5" />
              <span>Lihat Publik</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <BookOpen class="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 class="text-base font-bold text-slate-700">Belum ada kursus yang Anda buat</h3>
        <p class="text-xs text-slate-500 mt-1">Mulai bagikan keahlian Anda dengan membuat kursus pertama Anda.</p>
      </div>
    </div>
  </div>
</template>
