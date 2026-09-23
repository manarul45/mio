<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Play,
  CheckCircle2,
  Lock,
  Clock,
  BookOpen,
  Award,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  ArrowRight
} from 'lucide-vue-next'
import type { Course, Enrollment } from '~/types/database.types'

const route = useRoute()
const supabase = useSupabaseClient()
const { user } = useAuthProfile()
const slug = route.params.slug as string

// Fetch Course details with Sections and Lessons
const { data: course, error } = await useAsyncData(`course_${slug}`, async () => {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      category:categories(*),
      instructor:profiles!courses_instructor_id_fkey(*),
      sections:course_sections(
        id, title, description, sort_order,
        lessons:lessons(id, title, slug, duration_seconds, is_preview, is_active, sort_order),
        quizzes:quizzes(id, title, slug, passing_score, time_limit_minutes, sort_order)
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })

  // Sort sections and lessons
  if (data.sections) {
    data.sections.sort((a: any, b: any) => a.sort_order - b.sort_order)
    data.sections.forEach((sec: any) => {
      if (sec.lessons) sec.lessons.sort((a: any, b: any) => a.sort_order - b.sort_order)
      if (sec.quizzes) sec.quizzes.sort((a: any, b: any) => a.sort_order - b.sort_order)
    })
  }

  return data as Course
})

// Check enrollment status for logged in user
const { data: enrollment } = await useAsyncData(`enrollment_${slug}`, async () => {
  if (!user.value || !course.value) return null
  const { data } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', user.value.id)
    .eq('course_id', course.value.id)
    .eq('status', 'active')
    .maybeSingle()
  return data as Enrollment | null
})

const isEnrolled = computed(() => !!enrollment.value)

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0)
}

const totalLessons = computed(() => {
  if (!course.value?.sections) return 0
  return course.value.sections.reduce((acc, sec) => acc + (sec.lessons?.length || 0), 0)
})

const openSections = ref<Record<number, boolean>>({ 0: true })

const toggleSection = (index: number) => {
  openSections.value[index] = !openSections.value[index]
}

useHead({
  title: computed(() => `${course.value?.title || 'Detail Kursus'} — MIO Learning Academy`),
  meta: [
    { name: 'description', content: computed(() => course.value?.subtitle || course.value?.description || '') }
  ]
})
</script>

<template>
  <div v-if="course" class="bg-slate-50 min-h-screen pb-16">
    <!-- Header Banner -->
    <div class="bg-slate-900 text-white py-12 lg:py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div class="lg:col-span-8 space-y-4">
            <span class="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide">
              {{ course.category?.name || 'Kategori Kursus' }}
            </span>
            <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">{{ course.title }}</h1>
            <p class="text-slate-300 text-base leading-relaxed">{{ course.subtitle }}</p>

            <div class="flex flex-wrap items-center gap-6 pt-2 text-sm text-slate-400">
              <div class="flex items-center gap-2">
                <span class="text-slate-200">Instruktur:</span>
                <span class="font-semibold text-white">{{ course.instructor?.name }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <BookOpen class="w-4 h-4 text-indigo-400" />
                <span>{{ totalLessons }} Materi Pelajaran</span>
              </div>
              <div class="flex items-center gap-1.5">
                <Award class="w-4 h-4 text-amber-400" />
                <span>Sertifikat Resmi</span>
              </div>
            </div>
          </div>

          <!-- Sticky Action Card (Desktop) -->
          <div class="lg:col-span-4 bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div class="relative aspect-video rounded-xl overflow-hidden mb-5 bg-slate-100">
              <img
                :src="course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'"
                :alt="course.title"
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Price -->
            <div class="mb-5">
              <template v-if="course.discount_price && course.discount_price < course.price">
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-black text-indigo-600">{{ formatCurrency(course.discount_price) }}</span>
                  <span class="text-sm line-through text-slate-400">{{ formatCurrency(course.price) }}</span>
                </div>
              </template>
              <template v-else-if="course.price > 0">
                <span class="text-2xl font-black text-indigo-600">{{ formatCurrency(course.price) }}</span>
              </template>
              <template v-else>
                <span class="text-2xl font-black text-emerald-600">GRATIS</span>
              </template>
            </div>

            <!-- CTA Buttons -->
            <div class="space-y-3">
              <NuxtLink
                v-if="isEnrolled"
                :to="`/learning/${course.slug}`"
                class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md transition"
              >
                <span>Lanjut Belajar di Kelas</span>
                <ArrowRight class="w-4 h-4" />
              </NuxtLink>

              <NuxtLink
                v-else
                :to="`/checkout/${course.slug}`"
                class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-200 transition"
              >
                <span>Daftar / Beli Kursus</span>
                <ArrowRight class="w-4 h-4" />
              </NuxtLink>
            </div>

            <ul class="mt-6 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                <span>Akses penuh seumur hidup (Lifetime)</span>
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                <span>Kuis interaktif & latihan mandiri</span>
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                <span>Sertifikat kelulusan digital</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content: Description & Curriculum -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div class="lg:col-span-8 space-y-10">
          <!-- Description -->
          <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 class="text-xl font-bold text-slate-900 mb-4">Tentang Kursus Ini</h2>
            <div class="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed whitespace-pre-line">
              {{ course.description }}
            </div>
          </div>

          <!-- Curriculum Accordion -->
          <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-xl font-bold text-slate-900">Kurikulum & Materi</h2>
                <p class="text-xs text-slate-500 mt-0.5">{{ course.sections?.length || 0 }} Modul • {{ totalLessons }} Pelajaran</p>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-for="(section, idx) in course.sections"
                :key="section.id"
                class="border border-slate-200 rounded-xl overflow-hidden"
              >
                <!-- Section Header -->
                <button
                  @click="toggleSection(idx)"
                  class="w-full flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100 transition text-left"
                >
                  <div>
                    <h3 class="font-bold text-slate-900 text-sm">Modul {{ idx + 1 }}: {{ section.title }}</h3>
                    <p v-if="section.description" class="text-xs text-slate-500 mt-0.5">{{ section.description }}</p>
                  </div>
                  <ChevronUp v-if="openSections[idx]" class="w-4 h-4 text-slate-500" />
                  <ChevronDown v-else class="w-4 h-4 text-slate-500" />
                </button>

                <!-- Lessons & Quizzes inside section -->
                <div v-if="openSections[idx]" class="divide-y divide-slate-100 bg-white">
                  <div
                    v-for="lesson in section.lessons"
                    :key="lesson.id"
                    class="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/50 text-xs text-slate-700"
                  >
                    <div class="flex items-center gap-3">
                      <Play class="w-4 h-4 text-indigo-600" />
                      <span class="font-medium">{{ lesson.title }}</span>
                      <span v-if="lesson.is_preview" class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        Preview Gratis
                      </span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-400">
                      <span v-if="lesson.duration_seconds">{{ Math.round(lesson.duration_seconds / 60) }} mnt</span>
                      <Lock v-if="!isEnrolled && !lesson.is_preview" class="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div
                    v-for="quiz in section.quizzes"
                    :key="quiz.id"
                    class="p-3.5 px-4 flex items-center justify-between hover:bg-slate-50/50 text-xs text-slate-700 bg-indigo-50/30"
                  >
                    <div class="flex items-center gap-3">
                      <FileQuestion class="w-4 h-4 text-indigo-500" />
                      <span class="font-medium">Kuis: {{ quiz.title }}</span>
                    </div>
                    <span class="text-slate-400">Passing: {{ quiz.passing_score }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
