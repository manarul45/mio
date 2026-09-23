<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Play,
  CheckCircle2,
  Circle,
  Menu,
  X,
  Award,
  ArrowLeft,
  ChevronRight,
  BookOpen
} from 'lucide-vue-next'
import Swal from 'sweetalert2'
import type { Course, Lesson } from '~/types/database.types'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { user } = useAuthProfile()
const slug = route.params.slug as string

// Fetch course & curriculum
const { data: course } = await useAsyncData(`learning_course_${slug}`, async () => {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      sections:course_sections(
        id, title, sort_order,
        lessons:lessons(id, title, slug, youtube_video_id, duration_seconds, is_preview, is_active, sort_order)
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
    })
  }

  return data as Course
})

// Fetch student progress
const { data: progressList, refresh: refreshProgress } = await useAsyncData(`progress_${slug}`, async () => {
  if (!user.value || !course.value) return []
  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', user.value.id)
    .eq('course_id', course.value.id)

  return data || []
})

const completedLessonIds = computed(() => {
  return new Set((progressList.value || []).filter(p => p.is_completed).map(p => p.lesson_id))
})

// Flattened list of lessons
const allLessons = computed<Lesson[]>(() => {
  if (!course.value?.sections) return []
  const list: Lesson[] = []
  course.value.sections.forEach(sec => {
    if (sec.lessons) list.push(...sec.lessons)
  })
  return list
})

// Active lesson selection
const activeLessonIndex = ref(0)
const activeLesson = computed(() => {
  return allLessons.value[activeLessonIndex.value] || null
})

const isSidebarOpen = ref(true)
const isCompleting = ref(false)

const selectLesson = (lesson: Lesson) => {
  const idx = allLessons.value.findIndex(l => l.id === lesson.id)
  if (idx !== -1) {
    activeLessonIndex.value = idx
  }
}

const completeActiveLesson = async () => {
  if (!activeLesson.value || !course.value) return
  isCompleting.value = true

  try {
    const res: any = await $fetch('/api/learning/complete-lesson', {
      method: 'POST',
      body: {
        course_id: course.value.id,
        lesson_id: activeLesson.value.id
      }
    })

    await refreshProgress()

    if (res.is_course_complete) {
      Swal.fire({
        icon: 'success',
        title: 'Selamat! Anda Lulus!',
        text: 'Anda telah menyelesaikan seluruh materi kursus dan sertifikat resmi Anda telah diterbitkan.',
        confirmButtonText: 'Lihat Sertifikat',
        confirmButtonColor: '#4f46e5'
      }).then(() => {
        router.push(`/certificates/${res.certificate_code}`)
      })
    } else {
      // Advance to next lesson if available
      if (activeLessonIndex.value < allLessons.value.length - 1) {
        activeLessonIndex.value++
      }
    }
  } catch (err: any) {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: err.data?.statusMessage || 'Gagal menyimpan progres.'
    })
  } finally {
    isCompleting.value = false
  }
}

useHead({
  title: computed(() => `Belajar: ${course.value?.title || 'Kelas'} — MIO Learning Academy`)
})
</script>

<template>
  <div v-if="course" class="min-h-screen bg-slate-900 text-white flex flex-col">
    <!-- Learning Header Bar -->
    <header class="h-14 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <NuxtLink to="/dashboard" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <ArrowLeft class="w-5 h-5" />
        </NuxtLink>
        <span class="text-xs font-bold text-slate-300 truncate max-w-xs sm:max-w-md">{{ course.title }}</span>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="isSidebarOpen = !isSidebarOpen"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
        >
          <BookOpen class="w-4 h-4" />
          <span>{{ isSidebarOpen ? 'Sembunyikan Silabus' : 'Buka Silabus' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Player Area & Sidebar -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Player Center Screen -->
      <div class="flex-1 flex flex-col overflow-y-auto">
        <!-- Video Box -->
        <div class="w-full bg-black aspect-video max-h-[70vh] flex items-center justify-center">
          <iframe
            v-if="activeLesson?.youtube_video_id"
            :src="`https://www.youtube.com/embed/${activeLesson.youtube_video_id}?autoplay=1&rel=0`"
            class="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
          <div v-else class="text-center p-8 text-slate-500">
            <Play class="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p class="text-sm">Video tidak tersedia</p>
          </div>
        </div>

        <!-- Lesson Meta & Completion Action -->
        <div class="p-6 sm:p-8 max-w-4xl space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span class="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Pelajaran {{ activeLessonIndex + 1 }} dari {{ allLessons.length }}
              </span>
              <h1 class="text-xl sm:text-2xl font-bold mt-1 text-white">{{ activeLesson?.title }}</h1>
            </div>

            <button
              @click="completeActiveLesson"
              :disabled="isCompleting"
              :class="[
                'flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50',
                completedLessonIds.has(activeLesson?.id)
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
              ]"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>{{ completedLessonIds.has(activeLesson?.id) ? 'Selesai (Ulangi)' : 'Tandai Selesai & Lanjut' }}</span>
            </button>
          </div>

          <div v-if="activeLesson?.description" class="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed">
            <p>{{ activeLesson.description }}</p>
          </div>
        </div>
      </div>

      <!-- Curriculum Drawer / Sidebar -->
      <aside
        v-if="isSidebarOpen"
        class="w-80 sm:w-96 border-l border-slate-800 bg-slate-950 flex flex-col h-full overflow-y-auto"
      >
        <div class="p-4 border-b border-slate-800 font-bold text-sm text-slate-200">
          Daftar Silabus Kursus
        </div>

        <div class="divide-y divide-slate-800/80">
          <div v-for="(sec, sIdx) in course.sections" :key="sec.id" class="p-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
              Modul {{ sIdx + 1 }}: {{ sec.title }}
            </h3>

            <div class="space-y-1">
              <button
                v-for="lesson in sec.lessons"
                :key="lesson.id"
                @click="selectLesson(lesson)"
                :class="[
                  'w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition',
                  activeLesson?.id === lesson.id
                    ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-900'
                ]"
              >
                <div class="flex items-center gap-2.5 truncate">
                  <CheckCircle2 v-if="completedLessonIds.has(lesson.id)" class="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <Circle v-else class="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <span class="truncate">{{ lesson.title }}</span>
                </div>
                <Play v-if="activeLesson?.id === lesson.id" class="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
