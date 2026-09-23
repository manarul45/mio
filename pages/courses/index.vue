<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import Pagination from '@/components/UI/Pagination.vue'
import EmptyState from '@/components/UI/EmptyState.vue'
import { GraduationCap, Search, Video, FileQuestion } from 'lucide-vue-next'
import type { Course, Category } from '~/types/database.types'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const search = ref((route.query.search as string) || '')
const selectedCategory = ref((route.query.category as string) || '')
const selectedLevel = ref((route.query.level as string) || '')
const selectedSort = ref((route.query.sort as string) || 'latest')
const currentPage = ref(Number(route.query.page) || 1)
const perPage = 9

// Fetch categories
const { data: categories } = await useAsyncData('courses_page_categories', async () => {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return (data || []) as Category[]
})

// Fetch courses with full relations & counts
const { data: coursesData, refresh } = await useAsyncData(
  'courses_catalog',
  async () => {
    let query = supabase
      .from('courses')
      .select(`
        id, title, slug, subtitle, description, thumbnail_url, price, discount_price, level, status, created_at,
        category:categories(id, name, slug),
        instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url),
        sections:course_sections(
          id,
          lessons:lessons(id),
          quizzes:quizzes(id)
        )
      `, { count: 'exact' })
      .eq('status', 'published')

    if (selectedCategory.value) {
      // Find category id
      const cat = categories.value?.find(c => c.slug === selectedCategory.value)
      if (cat) {
        query = query.eq('category_id', cat.id)
      }
    }

    if (selectedLevel.value) {
      query = query.eq('level', selectedLevel.value)
    }

    if (search.value.trim()) {
      query = query.or(`title.ilike.%${search.value.trim()}%,subtitle.ilike.%${search.value.trim()}%`)
    }

    if (selectedSort.value === 'price_low') {
      query = query.order('price', { ascending: true })
    } else if (selectedSort.value === 'price_high') {
      query = query.order('price', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const from = (currentPage.value - 1) * perPage
    const to = from + perPage - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    const mapped = (data || []).map((c: any) => {
      let totalLessons = 0
      let totalQuizzes = 0
      if (c.sections) {
        c.sections.forEach((sec: any) => {
          totalLessons += sec.lessons?.length || 0
          totalQuizzes += sec.quizzes?.length || 0
        })
      }
      return {
        ...c,
        lessons_count: totalLessons,
        quizzes_count: totalQuizzes,
      }
    })

    return {
      courses: mapped,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage) || 1,
    }
  },
  { watch: [currentPage] }
)

const formatRupiah = (val: number | null | undefined) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

const applyFilters = () => {
  currentPage.value = 1
  router.push({
    path: '/courses',
    query: {
      search: search.value || undefined,
      category: selectedCategory.value || undefined,
      level: selectedLevel.value || undefined,
      sort: selectedSort.value || undefined,
      page: undefined,
    }
  })
  refresh()
}

let searchTimeout: any = null
const handleSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    applyFilters()
  }, 400)
}

const setCategory = (slug: string) => {
  selectedCategory.value = selectedCategory.value === slug ? '' : slug
  applyFilters()
}

const resetFilters = () => {
  search.value = ''
  selectedCategory.value = ''
  selectedLevel.value = ''
  selectedSort.value = 'latest'
  applyFilters()
}

const paginationLinks = computed(() => {
  const total = coursesData.value?.totalPages || 1
  const cur = currentPage.value
  const links = []

  links.push({
    url: cur > 1 ? `#` : null,
    label: '&laquo; Sebelumnya',
    active: false,
    onClick: () => { if (cur > 1) { currentPage.value--; refresh() } }
  })

  for (let i = 1; i <= total; i++) {
    links.push({
      url: `#`,
      label: String(i),
      active: i === cur,
      onClick: () => { currentPage.value = i; refresh() }
    })
  }

  links.push({
    url: cur < total ? `#` : null,
    label: 'Berikutnya &raquo;',
    active: false,
    onClick: () => { if (cur < total) { currentPage.value++; refresh() } }
  })

  return links
})

useHead({
  title: 'Katalog Kursus — MIO Learning Academy',
  meta: [
    { name: 'description', content: 'Jelajahi puluhan kursus terstruktur dari praktisi ahli di MIO Learning Academy.' }
  ]
})
</script>

<template>
  <div>
    <!-- Header Banner -->
    <div class="border-b border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 mb-3">
            <GraduationCap class="h-3.5 w-3.5" />
            <span>Katalog Kursus Lengkap</span>
          </span>
          <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tingkatkan Keahlian dengan Kursus Pilihan
          </h1>
          <p class="mt-2 text-base text-slate-600 dark:text-slate-400">
            Pilih dari {{ coursesData?.total || 0 }} kursus berkualitas tinggi yang dipandu oleh praktisi berpengalaman.
          </p>
        </div>

        <!-- Search and Quick Filter Bar -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <!-- Search Input -->
          <div class="md:col-span-2 relative">
            <input
              type="text"
              v-model="search"
              @input="handleSearchInput"
              placeholder="Cari judul, teknologi, atau topik kursus..."
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pl-11 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <Search class="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
          </div>

          <!-- Level Select -->
          <div>
            <select
              v-model="selectedLevel"
              @change="applyFilters"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Semua Tingkat (Level)</option>
              <option value="beginner">Pemula (Beginner)</option>
              <option value="intermediate">Menengah (Intermediate)</option>
              <option value="expert">Mahir (Expert)</option>
              <option value="all_levels">Semua Tingkat (All Levels)</option>
            </select>
          </div>

          <!-- Sort Select -->
          <div>
            <select
              v-model="selectedSort"
              @change="applyFilters"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="latest">Terbaru</option>
              <option value="popular">Terpopuler</option>
              <option value="price_low">Harga: Terendah ke Tertinggi</option>
              <option value="price_high">Harga: Tertinggi ke Terendah</option>
            </select>
          </div>
        </div>

        <!-- Category Chips Horizontal Bar -->
        <div class="mt-6 flex flex-wrap gap-2 items-center">
          <span class="text-xs font-semibold text-slate-500 mr-1">Kategori:</span>
          <button
            type="button"
            @click="setCategory('')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition',
              !selectedCategory
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
            ]"
          >
            Semua
          </button>
          <template v-for="cat in categories" :key="cat.id">
            <button
              type="button"
              @click="setCategory(cat.slug)"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition',
                selectedCategory === cat.slug
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
              ]"
            >
              {{ cat.name }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Main Course Grid Area -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Active filter badge summary -->
      <div v-if="search || selectedCategory || selectedLevel" class="mb-6 flex items-center justify-between">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          Menampilkan <span class="font-bold text-slate-900 dark:text-white">{{ coursesData?.total || 0 }}</span> kursus hasil pencarian
        </p>
        <button
          type="button"
          @click="resetFilters"
          class="text-xs font-semibold text-rose-600 hover:underline"
        >
          Reset Filter
        </button>
      </div>

      <!-- Course Card Grid -->
      <div v-if="coursesData && coursesData.courses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="course in coursesData.courses"
          :key="course.id"
          class="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        >
          <div>
            <!-- Thumbnail & Video Preview Badge -->
            <div class="relative aspect-video w-full bg-slate-950 overflow-hidden">
              <img
                :src="course.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80'"
                :alt="course.title"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

              <!-- Category Badge -->
              <div class="absolute top-3 left-3">
                <span class="rounded-lg bg-indigo-600/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow">
                  {{ course.category?.name || 'Development' }}
                </span>
              </div>

              <!-- Level Badge -->
              <div class="absolute top-3 right-3">
                <span class="rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-slate-200 capitalize">
                  {{ course.level ? course.level.replace('_', ' ') : 'All Levels' }}
                </span>
              </div>

              <!-- Bottom video info overlay -->
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-200 font-medium">
                <span class="flex items-center gap-1.5">
                  <Video class="h-3.5 w-3.5" />
                  <span>{{ course.lessons_count }} Video Pelajaran</span>
                </span>
                <span class="flex items-center gap-1.5">
                  <FileQuestion class="h-3.5 w-3.5" />
                  <span>{{ course.quizzes_count }} Kuis</span>
                </span>
              </div>
            </div>

            <!-- Card Body -->
            <div class="p-5 space-y-3">
              <h3 class="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 transition-colors">
                <NuxtLink :to="`/courses/${course.slug}`">
                  {{ course.title }}
                </NuxtLink>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {{ course.subtitle }}
              </p>

              <!-- Instructor Info -->
              <div class="flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-300">
                  {{ course.instructor?.name ? course.instructor.name[0] : 'I' }}
                </div>
                <span class="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                  {{ course.instructor?.name || 'Senior Instructor' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Card Footer: Pricing & CTA -->
          <div class="p-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div v-if="course.discount_price && Number(course.discount_price) < Number(course.price)" class="flex flex-col">
                <span class="text-xs text-slate-400 line-through">
                  {{ formatRupiah(course.price) }}
                </span>
                <span class="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  {{ formatRupiah(course.discount_price) }}
                </span>
              </div>
              <div v-else>
                <span class="text-base font-extrabold text-slate-900 dark:text-white">
                  {{ course.price > 0 ? formatRupiah(course.price) : 'Gratis' }}
                </span>
              </div>
            </div>

            <Button as="NuxtLink" :href="`/courses/${course.slug}`" variant="primary" size="sm">
              Detail Kursus
            </Button>
          </div>
        </div>
      </div>

      <!-- Empty State if no courses matched -->
      <EmptyState
        v-else
        title="Tidak Ada Kursus Ditemukan"
        description="Coba ubah kata kunci pencarian atau bersihkan filter kategori Anda."
        action-text="Reset Semua Filter"
        @action="resetFilters"
      />

      <!-- Pagination -->
      <div v-if="coursesData && coursesData.totalPages > 1" class="mt-12 flex justify-center">
        <Pagination :links="paginationLinks" />
      </div>
    </div>
  </div>
</template>
