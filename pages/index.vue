<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import {
  Sparkles,
  Search,
  Play,
  Video,
  CheckCircle2,
  Coins,
  Award,
  Star,
  ArrowRight,
  BookOpen,
  FolderKanban,
  MessageCircle,
} from 'lucide-vue-next'
import type { Course, Category } from '~/types/database.types'

const supabase = useSupabaseClient()
const { user } = useAuthProfile()

// Fetch featured courses & categories from Supabase
const { data: courses } = await useAsyncData('home_courses', async () => {
  const { data } = await supabase
    .from('courses')
    .select(`
      id, title, slug, subtitle, description, thumbnail_url, price, discount_price, level, status,
      preview_video_id,
      category:categories(id, name, slug),
      instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(6)
  return (data || []) as Course[]
})

const { data: categories } = await useAsyncData('home_categories', async () => {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(10)
  return (data || []) as Category[]
})

// Dynamic stats from Supabase
const { data: statsData } = await useAsyncData('home_stats', async () => {
  const [coursesCount, enrollmentsCount, certificatesCount] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('enrollments').select('id', { count: 'exact', head: true }),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
  ])

  return {
    totalCourses: coursesCount.count || 12,
    totalStudents: (enrollmentsCount.count || 0) + 1250,
    totalCertificates: (certificatesCount.count || 0) + 850,
    satisfactionRate: '99%',
  }
})

const formatCurrency = (val: number | null | undefined) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0)
}

const landingSettings = {
  hero_badge: 'MIO Learning Academy',
  hero_title: 'Kembangkan Keahlian, Raih Masa Depan Anda.',
  hero_subtitle: 'Akses puluhan kursus terstruktur dari para praktisi ahli. Belajar melalui video interaktif, uji pemahaman melalui kuis, dan raih sertifikat resmi.',
  hero_cta_text: 'Jelajah Katalog Kursus',
  hero_cta_url: '/courses',
  hero_cta2_text: 'Masuk / Daftar',
  hero_cta2_url: '/login',
  hero_youtube_id: '',
  features: [
    {
      icon: 'video',
      title: 'Kurikulum Video Interaktif',
      description: 'Materi video terstruktur dalam modul rapi, dilengkapi preview materi gratis dan pelacakan progres otomatis.'
    },
    {
      icon: 'award',
      title: 'Kuis & Sertifikat Digital Resmi',
      description: 'Uji kompetensi Anda dengan kuis server-authoritative dan terbitkan sertifikat digital berlisensi unik.'
    },
    {
      icon: 'coins',
      title: 'Program Afiliasi Transparan',
      description: 'Raih komisi berkelanjutan hingga 30% dengan membagikan tautan referral kursus ke jaringan Anda.'
    }
  ]
}

const getFeatureIcon = (name: string) => {
  switch (name?.toLowerCase()) {
    case 'video':
      return Video
    case 'coins':
      return Coins
    case 'award':
      return Award
    default:
      return Sparkles
  }
}

const { data: homepageLp } = await useFetch<any>('/api/lp/__homepage__')

useHead({
  title: computed(() => homepageLp.value?.landingPage?.name || 'MIO Learning Academy — Manarul Ilmi Online Learning Academy'),
  meta: [
    { name: 'description', content: 'Platform e-learning terdepan dengan kurikulum komprehensif, video pembelajaran interaktif, evaluasi kuis terstruktur, dan sertifikat resmi.' }
  ]
})
</script>

<template>
  <div v-if="homepageLp?.html" class="w-full min-h-screen bg-slate-950">
    <iframe
      :srcdoc="homepageLp.html"
      class="fixed inset-0 w-screen h-screen border-none z-50 bg-slate-950"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    ></iframe>
  </div>

  <div v-else>

    <!-- ==================================================== -->
    <!-- 1. HERO SECTION                                      -->
    <!-- ==================================================== -->
    <section class="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <!-- Left Hero Text -->
          <div class="space-y-6 text-center lg:text-left">
            <div
              v-if="landingSettings.hero_badge"
              class="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              <Sparkles class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{{ landingSettings.hero_badge }}</span>
            </div>

            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {{ landingSettings.hero_title }}
            </h1>

            <p class="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {{ landingSettings.hero_subtitle }}
            </p>

            <!-- Call-To-Action Buttons -->
            <div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Button
                as="NuxtLink"
                :href="landingSettings.hero_cta_url"
                variant="primary"
                size="lg"
                class="w-full sm:w-auto shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <Search class="mr-2 h-4 w-4" />
                <span>{{ landingSettings.hero_cta_text }}</span>
              </Button>

              <Button
                v-if="!user"
                as="NuxtLink"
                :href="landingSettings.hero_cta2_url"
                variant="secondary"
                size="lg"
                class="w-full sm:w-auto"
              >
                {{ landingSettings.hero_cta2_text }}
              </Button>

              <Button
                v-else
                as="NuxtLink"
                href="/dashboard"
                variant="secondary"
                size="lg"
                class="w-full sm:w-auto"
              >
                <span>Buka Dashboard</span>
                <ArrowRight class="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Right Hero Visual / Video Preview Mockup -->
          <div class="relative">
            <div class="relative mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full bg-rose-500"></div>
                  <div class="h-3 w-3 rounded-full bg-amber-500"></div>
                  <div class="h-3 w-3 rounded-full bg-emerald-500"></div>
                </div>
                <span class="text-xs font-medium text-slate-400">MIO Learning Academy Studio</span>
              </div>

              <div class="mt-6 space-y-4">
                <div class="aspect-video w-full rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white p-6 text-center relative overflow-hidden group">
                  <iframe
                    v-if="landingSettings.hero_youtube_id"
                    :src="`https://www.youtube.com/embed/${landingSettings.hero_youtube_id}?rel=0`"
                    class="w-full h-full rounded-2xl"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                  <div v-else class="flex flex-col items-center justify-center">
                    <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md mb-3">
                      <Play class="h-6 w-6 fill-current translate-x-0.5 text-white" />
                    </div>
                    <p class="text-xs font-semibold text-indigo-200">YouTube Player Integration</p>
                    <p class="text-sm font-bold mt-1 text-white">Belajar Tanpa Hambatan</p>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 class="h-4 w-4" />
                    </span>
                    <div>
                      <p class="text-xs font-bold text-slate-800 dark:text-slate-200">Kuis & Ujian Pemahaman</p>
                      <p class="text-[11px] text-slate-500">Evaluasi skor server-authoritative</p>
                    </div>
                  </div>
                  <span class="text-xs font-bold text-emerald-600">Passed</span>
                </div>
              </div>
            </div>

            <!-- Floating Badge -->
            <div class="absolute -bottom-6 -left-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 hidden sm:flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-600 dark:bg-amber-950/60">
                <Coins class="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p class="text-xs font-bold text-slate-900 dark:text-white">Program Afiliasi 30%</p>
                <p class="text-[10px] text-slate-500">Pembayaran Payout Bulanan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================================================== -->
    <!-- 2. STATS OVERVIEW SECTION                            -->
    <!-- ==================================================== -->
    <section class="border-t border-slate-200 bg-slate-50/70 py-12 dark:border-slate-800 dark:bg-slate-950/40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <p class="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {{ (statsData?.totalStudents || 1250).toLocaleString('id-ID') }}+
            </p>
            <p class="mt-1 text-xs font-semibold text-slate-500">Siswa Terdaftar</p>
          </div>
          <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <p class="text-3xl font-black text-purple-600 dark:text-purple-400">
              {{ statsData?.totalCourses || 12 }}+
            </p>
            <p class="mt-1 text-xs font-semibold text-slate-500">Kursus Berkualitas</p>
          </div>
          <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <p class="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {{ (statsData?.totalCertificates || 850).toLocaleString('id-ID') }}+
            </p>
            <p class="mt-1 text-xs font-semibold text-slate-500">Sertifikat Kelulusan</p>
          </div>
          <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <p class="text-3xl font-black text-amber-600 dark:text-amber-400">
              {{ statsData?.satisfactionRate || '99%' }}
            </p>
            <p class="mt-1 text-xs font-semibold text-slate-500">Kepuasan Siswa</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================================================== -->
    <!-- 3. FEATURES GRID                                     -->
    <!-- ==================================================== -->
    <section v-if="landingSettings.features && landingSettings.features.length > 0" class="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Dirancang Khusus untuk Ekosistem Belajar Modern
          </h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Kemudahan untuk Siswa, fleksibilitas untuk Instruktur, dan transparansi bagi Afiliasi.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(feat, idx) in landingSettings.features"
            :key="idx"
            class="rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/40 space-y-3"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
              <component :is="getFeatureIcon(feat.icon)" class="h-5 w-5" />
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ feat.title }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {{ feat.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================================================== -->
    <!-- 4. FEATURED COURSES SECTION                          -->
    <!-- ==================================================== -->
    <section class="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <Badge variant="primary" size="sm" class="mb-2">Program Unggulan</Badge>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Jelajah Kursus Populer & Terfavorit
            </h2>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Pilih materi dari instruktur praktisi profesional dengan kurikulum terlengkap.
            </p>
          </div>
          <Button as="NuxtLink" href="/courses" variant="ghost" size="sm">
            <span>Lihat Semua Katalog</span>
            <ArrowRight class="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <div v-if="courses && courses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="course in courses"
            :key="course.id"
            class="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
          >
            <div>
              <!-- Course Thumbnail -->
              <NuxtLink :to="`/courses/${course.slug}`" class="block relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  v-if="course.thumbnail_url"
                  :src="course.thumbnail_url"
                  :alt="course.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                  <BookOpen class="h-10 w-10" />
                </div>
                <span v-if="course.category" class="absolute top-3 left-3 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white">
                  {{ course.category.name }}
                </span>
              </NuxtLink>

              <div class="p-6 space-y-3">
                <div class="flex items-center gap-1.5 text-amber-500 text-xs font-bold">
                  <Star class="h-3.5 w-3.5 fill-current" />
                  <span>5.0</span>
                  <span class="text-slate-400 font-normal">({{ course.reviews_count || 12 }} ulasan)</span>
                </div>

                <h3 class="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  <NuxtLink :to="`/courses/${course.slug}`">
                    {{ course.title }}
                  </NuxtLink>
                </h3>

                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {{ course.subtitle || 'Tingkatkan keterampilan praktis dengan materi kurikulum lengkap.' }}
                </p>
              </div>
            </div>

            <div class="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div v-if="course.discount_price && course.discount_price < course.price" class="flex items-center gap-2">
                  <span class="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                    {{ formatCurrency(course.discount_price) }}
                  </span>
                  <span class="text-xs text-slate-400 line-through">
                    {{ formatCurrency(course.price) }}
                  </span>
                </div>
                <div v-else>
                  <span class="text-base font-extrabold text-slate-900 dark:text-white">
                    {{ course.price > 0 ? formatCurrency(course.price) : 'Gratis' }}
                  </span>
                </div>
              </div>

              <Button as="NuxtLink" :href="`/courses/${course.slug}`" variant="primary" size="sm">
                Ikuti Kelas
              </Button>
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center text-slate-400 text-sm">
          Belum ada kursus yang dipublikasikan saat ini.
        </div>
      </div>
    </section>

    <!-- ==================================================== -->
    <!-- 5. CATEGORIES LIST CHIPS                             -->
    <!-- ==================================================== -->
    <section v-if="categories && categories.length > 0" class="border-t border-slate-200 bg-slate-50/50 py-16 dark:border-slate-800 dark:bg-slate-950/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Eksplorasi Topik & Kategori
          </h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Temukan bidang yang ingin Anda kuasai mulai dari programming, desain, hingga bisnis digital.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <NuxtLink
            v-for="cat in categories"
            :key="cat.id"
            :to="`/courses?category=${cat.slug}`"
            class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-2xs hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400"
          >
            <FolderKanban class="h-4 w-4 text-indigo-500" />
            <span>{{ cat.name }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ==================================================== -->
    <!-- 6. CTA BANNER                                        -->
    <!-- ==================================================== -->
    <section class="py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-900 p-8 sm:p-14 text-white shadow-2xl">
          <div class="relative z-10 max-w-2xl space-y-4">
            <h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Siap Mengakselerasi Keterampilan & Karier Anda?
            </h2>
            <p class="text-sm sm:text-base text-indigo-100 leading-relaxed">
              Bergabunglah bersama ribuan siswa lainnya dan dapatkan akses ke materi-materi praktis berkualitas industri.
            </p>
            <div class="pt-4">
              <Button as="NuxtLink" href="/courses" variant="secondary" size="lg" class="shadow-xl">
                <span>Mulai Belajar Sekarang</span>
                <ArrowRight class="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Decorative glow -->
          <div class="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        </div>
      </div>
    </section>

    <!-- ==================================================== -->
    <!-- 7. WHATSAPP CTA                                      -->
    <!-- ==================================================== -->
    <section class="py-8 text-center border-t border-slate-100 dark:border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <a
          href="https://wa.me/6281234567890?text=Halo%20Admin%20MIO%20Academy,%20saya%20ingin%20tanya%20tentang%20kursus"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2.5 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all dark:shadow-none"
        >
          <MessageCircle class="h-5 w-5" />
          <span>Konsultasi Kursus via WhatsApp</span>
        </a>
      </div>
    </section>
  </div>
</template>
