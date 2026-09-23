<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Filter, BookOpen, Star, Sparkles } from 'lucide-vue-next'
import type { Course, Category } from '~/types/database.types'

const supabase = useSupabaseClient()
const route = useRoute()

const searchQuery = ref('')
const selectedCategory = ref<string>((route.query.category as string) || 'all')

const { data: categories } = await useAsyncData('courses_categories', async () => {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  return (data || []) as Category[]
})

const { data: courses, refresh } = await useAsyncData('courses_catalog', async () => {
  let query = supabase
    .from('courses')
    .select(`
      id, title, slug, subtitle, description, thumbnail_url, price, discount_price, level, status,
      category:categories(id, name, slug),
      instructor:profiles!courses_instructor_id_fkey(id, name, avatar_url)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  const { data } = await query
  return (data || []) as Course[]
})

const filteredCourses = computed(() => {
  if (!courses.value) return []
  return courses.value.filter(c => {
    const matchesCat = selectedCategory.value === 'all' || c.category?.slug === selectedCategory.value
    const matchesSearch = !searchQuery.value ||
      c.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.value.toLowerCase()))
    return matchesCat && matchesSearch
  })
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
  title: 'Katalog Kursus — MIO Learning Academy'
})
</script>

<template>
  <div class="py-10 bg-slate-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title & Search Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Katalog Kursus</h1>
        <p class="text-slate-600 text-sm mt-1">Pilih kurikulum terstruktur dan tingkatkan keahlian Anda hari ini</p>

        <div class="mt-6 flex flex-col sm:flex-row gap-4">
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search class="w-4 h-4" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari materi atau topik kursus..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm"
            />
          </div>

          <!-- Category Pills Filter -->
          <div class="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              @click="selectedCategory = 'all'"
              :class="[
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              ]"
            >
              Semua Kategori
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              @click="selectedCategory = cat.slug"
              :class="[
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                selectedCategory === cat.slug
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              ]"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Course Grid -->
      <div v-if="filteredCourses.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="course in filteredCourses"
          :key="course.id"
          class="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:shadow-xl hover:border-indigo-100 transition-all duration-300"
        >
          <!-- Thumbnail -->
          <NuxtLink :to="`/courses/${course.slug}`" class="relative aspect-video overflow-hidden bg-slate-100">
            <img
              :src="course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'"
              :alt="course.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <span
              v-if="course.discount_price && course.discount_price < course.price"
              class="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow"
            >
              DISKON
            </span>
          </NuxtLink>

          <!-- Card Body -->
          <div class="p-6 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  {{ course.category?.name || 'Umum' }}
                </span>
                <span class="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                  {{ course.level }}
                </span>
              </div>

              <NuxtLink :to="`/courses/${course.slug}`">
                <h3 class="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2">
                  {{ course.title }}
                </h3>
              </NuxtLink>

              <p class="text-xs text-slate-500 line-clamp-2 mt-2">
                {{ course.subtitle || course.description }}
              </p>
            </div>

            <!-- Instructor & Price -->
            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <template v-if="course.discount_price && course.discount_price < course.price">
                  <span class="text-xs line-through text-slate-400 block">{{ formatCurrency(course.price) }}</span>
                  <span class="text-base font-extrabold text-indigo-600">{{ formatCurrency(course.discount_price) }}</span>
                </template>
                <template v-else-if="course.price > 0">
                  <span class="text-base font-extrabold text-indigo-600">{{ formatCurrency(course.price) }}</span>
                </template>
                <template v-else>
                  <span class="text-base font-extrabold text-emerald-600">GRATIS</span>
                </template>
              </div>

              <NuxtLink
                :to="`/courses/${course.slug}`"
                class="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                Ikuti Kursus
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <BookOpen class="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 class="text-lg font-bold text-slate-700">Tidak ada kursus yang ditemukan</h3>
        <p class="text-sm text-slate-500 mt-1">Coba kata kunci pencarian lain atau pilih kategori berbeda.</p>
      </div>
    </div>
  </div>
</template>
