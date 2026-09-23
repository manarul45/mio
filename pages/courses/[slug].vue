<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import Modal from '@/components/UI/Modal.vue'
import Textarea from '@/components/UI/Textarea.vue'
import {
  Target,
  Globe,
  Video,
  FileQuestion,
  Sparkles,
  Check,
  MessageCircle,
  Send,
  Play,
  Award,
  BookOpen,
  Users,
  ListChecks,
  Star,
  Edit3,
} from 'lucide-vue-next'
import type { Course, Enrollment } from '~/types/database.types'

const route = useRoute()
const supabase = useSupabaseClient()
const { user } = useAuthProfile()
const swal = useSwal()
const slug = route.params.slug as string

// Fetch Course details with Sections, Lessons, and Quizzes
const { data: course, refresh: refreshCourse } = await useAsyncData(`course_detail_${slug}`, async () => {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      category:categories(id, name, slug),
      instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url),
      sections:course_sections(
        id, title, description, sort_order,
        lessons:lessons(id, title, slug, youtube_video_id, duration_seconds, is_preview, is_active, sort_order, description),
        quizzes:quizzes(id, title, slug, passing_score, time_limit_minutes, sort_order)
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })

  // Sort sections and items
  if (data.sections) {
    data.sections.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    data.sections.forEach((sec: any) => {
      if (sec.lessons) sec.lessons.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      if (sec.quizzes) sec.quizzes.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    })
  }

  return data as Course
})

// Check enrollment status
const { data: enrollment } = await useAsyncData(`enrollment_check_${slug}`, async () => {
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

// Metrics calculation
const metrics = computed(() => {
  let totalLessons = 0
  let totalQuizzes = 0
  if (course.value?.sections) {
    course.value.sections.forEach((sec: any) => {
      totalLessons += sec.lessons?.length || 0
      totalQuizzes += sec.quizzes?.length || 0
    })
  }
  return {
    total_lessons: totalLessons,
    total_quizzes: totalQuizzes,
  }
})

const getSortedSectionItems = (section: any) => {
  const lessons = (section.lessons || []).map((l: any) => ({ ...l, item_type: 'lesson' }))
  const quizzes = (section.quizzes || []).map((q: any) => ({ ...q, item_type: 'quiz' }))
  return [...lessons, ...quizzes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

// Free preview modal
const activePreviewLesson = ref<any>(null)
const isPreviewModalOpen = ref(false)

const openPreview = (lesson: any) => {
  activePreviewLesson.value = lesson
  isPreviewModalOpen.value = true
}

const closePreview = () => {
  isPreviewModalOpen.value = false
  activePreviewLesson.value = null
}

// Review modal & state
const isReviewModalOpen = ref(false)
const reviewRating = ref(5)
const reviewText = ref('')
const isSubmittingReview = ref(false)

const submitReview = async () => {
  if (!user.value || !course.value) return
  isSubmittingReview.value = true

  try {
    const { error } = await supabase
      .from('reviews')
      .upsert({
        user_id: user.value.id,
        course_id: course.value.id,
        rating: reviewRating.value,
        review_text: reviewText.value,
      })

    if (error) throw error

    swal.toastSuccess('Ulasan Anda berhasil dikirim!')
    isReviewModalOpen.value = false
    refreshCourse()
  } catch (err: any) {
    swal.error('Gagal mengirim ulasan', err.message)
  } finally {
    isSubmittingReview.value = false
  }
}

const formatRupiah = (val: number | null | undefined) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

useHead({
  title: computed(() => `${course.value?.title || 'Detail Kursus'} — MIO Learning Academy`),
  meta: [
    { name: 'description', content: computed(() => course.value?.subtitle || course.value?.description || '') }
  ]
})
</script>

<template>
  <div v-if="course">
    <!-- Course Hero Section -->
    <div class="bg-slate-900 text-white py-12 lg:py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <!-- Left: Course Details Header -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Breadcrumbs -->
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <NuxtLink to="/courses" class="hover:text-white transition">Katalog Kursus</NuxtLink>
              <span>/</span>
              <span class="text-indigo-400">{{ course.category?.name || 'Development' }}</span>
            </div>

            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {{ course.title }}
            </h1>

            <p class="text-base text-slate-300 leading-relaxed">
              {{ course.subtitle }}
            </p>

            <!-- Key Metrics Badges -->
            <div class="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
              <div class="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <Target class="h-3.5 w-3.5 text-indigo-400" />
                <span>Tingkat:</span>
                <span class="text-white font-bold capitalize">{{ course.level?.replace('_', ' ') || 'All Levels' }}</span>
              </div>
              <div class="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <Globe class="h-3.5 w-3.5 text-indigo-400" />
                <span>Bahasa:</span>
                <span class="text-white font-bold uppercase">{{ course.language || 'ID' }}</span>
              </div>
              <div class="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <Video class="h-3.5 w-3.5 text-indigo-400" />
                <span>{{ metrics.total_lessons }} Video</span>
                <span class="text-slate-500">•</span>
                <FileQuestion class="h-3.5 w-3.5 text-indigo-400" />
                <span>{{ metrics.total_quizzes }} Kuis</span>
              </div>
            </div>

            <!-- Instructor Intro -->
            <div class="flex items-center gap-3 pt-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-sm text-white shadow-md">
                {{ course.instructor?.name ? course.instructor.name[0] : 'I' }}
              </div>
              <div>
                <p class="text-xs text-slate-400">Pengajar Kursus</p>
                <p class="text-sm font-bold text-white">{{ course.instructor?.name || 'Senior Instructor' }}</p>
              </div>
            </div>
          </div>

          <!-- Right / Sidebar Checkout Floating Card on Desktop -->
          <div class="rounded-3xl border border-slate-700 bg-slate-800/90 backdrop-blur-md p-6 shadow-2xl space-y-6">
            <!-- Preview Video / Thumbnail -->
            <div class="relative aspect-video w-full rounded-2xl bg-black overflow-hidden group">
              <iframe
                v-if="course.preview_video_id"
                :src="`https://www.youtube.com/embed/${course.preview_video_id}`"
                title="Course Preview Video"
                class="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
              <img
                v-else-if="course.thumbnail_url"
                :src="course.thumbnail_url"
                :alt="course.title"
                class="h-full w-full object-cover"
              />
              <div v-else class="h-full w-full flex items-center justify-center text-xs text-slate-400">
                Video Preview Belum Tersedia
              </div>
            </div>

            <!-- Pricing Section -->
            <div class="space-y-1">
              <div v-if="course.discount_price && Number(course.discount_price) < Number(course.price)" class="flex items-baseline gap-3">
                <span class="text-3xl font-black text-white">
                  {{ formatRupiah(course.discount_price) }}
                </span>
                <span class="text-sm text-slate-400 line-through">
                  {{ formatRupiah(course.price) }}
                </span>
                <span class="rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400">
                  Hemat {{ Math.round(((Number(course.price) - Number(course.discount_price)) / Number(course.price)) * 100) }}%
                </span>
              </div>
              <div v-else>
                <span class="text-3xl font-black text-white">
                  {{ formatRupiah(course.price) }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400">Akses seumur hidup termasuk pembaruan materi & sertifikat.</p>
            </div>

            <!-- Action Buttons -->
            <div class="space-y-3">
              <Button
                v-if="isEnrolled"
                as="NuxtLink"
                :href="`/learning/${course.slug}`"
                variant="primary"
                size="lg"
                class="w-full justify-center shadow-lg shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700"
              >
                <Play class="mr-2 h-4 w-4 fill-current" />
                <span>Lanjut Belajar di Kelas</span>
              </Button>
              <Button
                v-else
                as="NuxtLink"
                :href="`/checkout/${course.slug}`"
                variant="primary"
                size="lg"
                class="w-full justify-center shadow-lg shadow-indigo-500/30"
              >
                <span>Beli Kursus Sekarang</span>
              </Button>
            </div>

            <!-- Course Benefits Checklist -->
            <div class="pt-4 border-t border-slate-700/80 space-y-2.5 text-xs text-slate-300">
              <div class="flex items-center gap-2">
                <Check class="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Akses penuh ke {{ metrics.total_lessons }} video materi HD</span>
              </div>
              <div class="flex items-center gap-2">
                <Check class="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{{ metrics.total_quizzes }} kuis evaluasi interaktif</span>
              </div>
              <div class="flex items-center gap-2">
                <Check class="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Sertifikat kelulusan digital berlisensi resmi</span>
              </div>
              <div class="flex items-center gap-2">
                <Check class="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Dukungan grup diskusi WhatsApp & Telegram</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Course Content & Tabs Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div class="lg:col-span-2 space-y-12">
          <!-- Learning Objectives -->
          <div
            v-if="course.learning_objectives && course.learning_objectives.length > 0"
            class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
          >
            <div class="flex items-center gap-2.5">
              <Target class="h-5 w-5 text-indigo-600" />
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                Yang Akan Anda Pelajari
              </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="(obj, idx) in course.learning_objectives"
                :key="idx"
                class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"
              >
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs mt-0.5 dark:bg-emerald-950 dark:text-emerald-300">
                  <Check class="h-3 w-3" />
                </span>
                <span>{{ obj }}</span>
              </div>
            </div>
          </div>

          <!-- Curriculum Accordion -->
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2.5">
                  <BookOpen class="h-6 w-6 text-indigo-600" />
                  <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Kurikulum & Silabus Kursus
                  </h2>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  {{ course.sections?.length || 0 }} Modul • {{ metrics.total_lessons }} Video Pelajaran • {{ metrics.total_quizzes }} Kuis
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-for="(section, sIdx) in course.sections"
                :key="section.id"
                class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900"
              >
                <!-- Section Header -->
                <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                      {{ section.title }}
                    </h3>
                    <p v-if="section.description" class="text-xs text-slate-500 mt-0.5">
                      {{ section.description }}
                    </p>
                  </div>
                  <span class="text-xs font-semibold text-slate-500">
                    {{ section.lessons?.length || 0 }} Video
                  </span>
                </div>

                <!-- Unified Items in Section -->
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
                  <template v-for="item in getSortedSectionItems(section)" :key="item.item_type + '-' + item.id">
                    <!-- Lesson Row -->
                    <div
                      v-if="item.item_type === 'lesson'"
                      class="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition dark:hover:bg-slate-800/30"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <Video class="h-4 w-4 text-slate-400 shrink-0" />
                        <span class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {{ item.title }}
                        </span>
                      </div>

                      <div v-if="item.is_preview" class="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          @click="openPreview(item)"
                          class="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition dark:bg-indigo-950 dark:text-indigo-300"
                        >
                          <Play class="h-3 w-3 fill-current" />
                          <span>Free Preview</span>
                        </button>
                      </div>
                    </div>

                    <!-- Quiz Row -->
                    <div
                      v-else-if="item.item_type === 'quiz'"
                      class="px-6 py-3.5 bg-purple-50/20 dark:bg-purple-950/20 flex items-center justify-between"
                    >
                      <div class="flex items-center gap-3">
                        <FileQuestion class="h-4 w-4 text-purple-600 shrink-0" />
                        <span class="text-sm font-bold text-purple-900 dark:text-indigo-200">
                          {{ item.title }}
                        </span>
                      </div>
                      <Badge variant="purple" size="sm">
                        Passing Score: {{ item.passing_score }}%
                      </Badge>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Community Support Links -->
          <div class="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-8 dark:border-indigo-950 dark:bg-indigo-950/30 space-y-6">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <MessageCircle class="h-5 w-5" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                  Komunitas & Diskusi Kursus
                </h3>
                <p class="text-xs text-slate-600 dark:text-slate-400">
                  Bergabunglah dengan grup diskusi resmi untuk tanya jawab langsung bersama instruktur dan sesama student.
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-4">
              <a
                v-if="course.whatsapp_group_url"
                :href="course.whatsapp_group_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <MessageCircle class="h-4 w-4" />
                <span>Join WhatsApp Group</span>
              </a>
              <a
                v-if="course.telegram_url"
                :href="course.telegram_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition"
              >
                <Send class="h-4 w-4" />
                <span>Join Telegram Channel</span>
              </a>
              <a
                v-if="course.whatsapp_contact_url"
                :href="course.whatsapp_contact_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <MessageCircle class="h-4 w-4 text-emerald-600" />
                <span>Chat via WhatsApp</span>
              </a>
            </div>
          </div>

          <!-- Student Reviews Section -->
          <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div class="flex items-center gap-2">
                  <Star class="h-5 w-5 fill-amber-400 text-amber-400" />
                  <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                    5.0 Rating Kursus
                  </h2>
                  <span class="text-xs text-slate-400">(12 ulasan siswa)</span>
                </div>
              </div>

              <Button
                v-if="isEnrolled"
                type="button"
                @click="isReviewModalOpen = true"
                variant="primary"
                size="sm"
              >
                <Edit3 class="mr-1.5 h-3.5 w-3.5" />
                <span>Tulis Ulasan</span>
              </Button>
            </div>

            <div class="text-center py-6 text-xs text-slate-400">
              Belum ada ulasan untuk kursus ini. Jadilah siswa pertama yang memberikan ulasan!
            </div>
          </div>
        </div>

        <!-- Right Column: Requirements & Target Audience -->
        <div class="space-y-8">
          <!-- Requirements -->
          <div
            v-if="course.requirements && course.requirements.length > 0"
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
          >
            <div class="flex items-center gap-2">
              <ListChecks class="h-4 w-4 text-indigo-600" />
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Prasyarat Mengikuti Kursus
              </h3>
            </div>
            <ul class="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li
                v-for="(req, idx) in course.requirements"
                :key="idx"
                class="flex items-start gap-2.5"
              >
                <span class="text-indigo-600 font-bold">•</span>
                <span>{{ req }}</span>
              </li>
            </ul>
          </div>

          <!-- Target Audience -->
          <div
            v-if="course.target_audience && course.target_audience.length > 0"
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
          >
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-indigo-600" />
              <h3 class="text-base font-bold text-slate-900 dark:text-white">
                Kursus Ini Ditujukan Untuk
              </h3>
            </div>
            <ul class="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li
                v-for="(aud, idx) in course.target_audience"
                :key="idx"
                class="flex items-start gap-2.5"
              >
                <span class="text-indigo-600 font-bold">•</span>
                <span>{{ aud }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Free Preview Video Modal -->
    <Modal
      :show="isPreviewModalOpen"
      max-width="2xl"
      :title="activePreviewLesson?.title || 'Preview Video Pelajaran'"
      @close="closePreview"
    >
      <div class="aspect-video w-full rounded-xl bg-black overflow-hidden">
        <iframe
          v-if="activePreviewLesson?.youtube_video_id"
          :src="`https://www.youtube.com/embed/${activePreviewLesson.youtube_video_id}?autoplay=1`"
          :title="activePreviewLesson.title"
          class="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
      <p class="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {{ activePreviewLesson?.description }}
      </p>

      <template #footer>
        <Button type="button" @click="closePreview" variant="secondary" size="md">
          Tutup Preview
        </Button>
      </template>
    </Modal>

    <!-- Write Course Review Modal -->
    <Modal
      :show="isReviewModalOpen"
      max-width="md"
      title="Berikan Rating & Ulasan Kursus"
      @close="isReviewModalOpen = false"
    >
      <form id="reviewFormModal" @submit.prevent="submitReview" class="space-y-4">
        <div class="space-y-1.5 text-center py-2">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Bintang Rating</label>
          <div class="flex justify-center gap-2">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              @click="reviewRating = star"
              class="p-1 hover:scale-110 transition"
            >
              <Star
                :class="[
                  'h-7 w-7',
                  star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                ]"
              />
            </button>
          </div>
        </div>

        <Textarea
          v-model="reviewText"
          label="Ulasan Anda *"
          placeholder="Bagikan pengalaman belajar Anda, materi yang paling bermanfaat, atau saran untuk kursus ini..."
          rows="4"
          required
        />
      </form>

      <template #footer>
        <Button type="button" @click="isReviewModalOpen = false" variant="secondary" size="md">
          Batal
        </Button>
        <Button type="submit" form="reviewFormModal" :loading="isSubmittingReview" variant="primary" size="md">
          Kirim Ulasan
        </Button>
      </template>
    </Modal>

    <!-- Mobile Sticky Bottom Buy Bar -->
    <div class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md p-3 dark:border-slate-800 dark:bg-slate-900/95 shadow-2xl">
      <div class="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div>
          <span class="text-[10px] text-slate-400 block font-medium">Investasi Belajar:</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
              {{ formatRupiah(course.discount_price && Number(course.discount_price) < Number(course.price) ? course.discount_price : course.price) }}
            </span>
            <span v-if="course.discount_price && Number(course.discount_price) < Number(course.price)" class="text-[10px] text-slate-400 line-through">
              {{ formatRupiah(course.price) }}
            </span>
          </div>
        </div>

        <Button
          v-if="isEnrolled"
          as="NuxtLink"
          :href="`/learning/${course.slug}`"
          variant="primary"
          size="md"
          class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 font-bold shrink-0"
        >
          <span>Lanjut Belajar</span>
        </Button>
        <Button
          v-else
          as="NuxtLink"
          :href="`/checkout/${course.slug}`"
          variant="primary"
          size="md"
          class="shadow-lg shadow-indigo-200 dark:shadow-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 font-bold shrink-0"
        >
          <span>Beli Sekarang</span>
        </Button>
      </div>
    </div>
  </div>
</template>
