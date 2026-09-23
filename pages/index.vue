<script setup lang="ts">
import { ref } from 'vue'
import {
  Sparkles,
  Search,
  Video,
  CheckCircle2,
  Award,
  Star,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Users
} from 'lucide-vue-next'
import type { Course, Category } from '~/types/database.types'

const supabase = useSupabaseClient()

// Fetch featured courses & categories from Supabase with SSR caching
const { data: courses } = await useAsyncData('home_courses', async () => {
  const { data } = await supabase
    .from('courses')
    .select(`
      id, title, slug, subtitle, description, thumbnail_url, price, discount_price, level, status,
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
    .limit(8)
  return (data || []) as Category[]
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
  title: 'MIO Learning Academy — Belajar Skill Digital Online Terbaik',
  meta: [
    { name: 'description', content: 'Tingkatkan keahlian digital Anda bersama instruktur berpengalaman di Manarul Ilmi Online Learning Academy.' }
  ]
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-white py-16 sm:py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div class="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide">
              <Sparkles class="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>Platform Pembelajaran Digital Modern</span>
            </div>

            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Tingkatkan Potensi <br />
              <span class="text-indigo-600">Masa Depan Anda</span> Bersama Kami
            </h1>

            <p class="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0">
              Pelajari skill yang dibutuhkan industri langsung dari para praktisi ahli. Akses kurikulum terstruktur, materi video interaktif, kuis terintegrasi, dan sertifikat resmi.
            </p>

            <div class="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
              <NuxtLink
                to="/courses"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-0.5"
              >
                <span>Mulai Belajar Sekarang</span>
                <ArrowRight class="w-4 h-4" />
              </NuxtLink>

              <NuxtLink
                to="/guide"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>Lihat Panduan</span>
              </NuxtLink>
            </div>

            <!-- Value Props -->
            <div class="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-left">
              <div>
                <p class="text-2xl font-bold text-slate-900">100%</p>
                <p class="text-xs text-slate-500 font-medium">Praktis & Interaktif</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-slate-900">Resmi</p>
                <p class="text-xs text-slate-500 font-medium">Sertifikat Kelulusan</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-slate-900">Lifetime</p>
                <p class="text-xs text-slate-500 font-medium">Akses Materi</p>
              </div>
            </div>
          </div>

          <div class="lg:col-span-5 relative">
            <div class="relative mx-auto max-w-md rounded-2xl bg-white p-3 shadow-2xl shadow-indigo-100 ring-1 ring-slate-900/5">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop"
                alt="Students learning together"
                class="rounded-xl w-full h-80 object-cover"
              />
              <div class="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3">
                <div class="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Award class="w-6 h-6" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-400">Verifikasi Terbuka</p>
                  <p class="text-sm font-bold text-slate-800">Sertifikat Digital Valid</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories Section -->
    <section v-if="categories && categories.length > 0" class="py-12 bg-white border-y border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Kategori Pilihan</h2>
            <p class="text-sm text-slate-500">Eksplorasi topik yang sesuai dengan minat dan target karier Anda</p>
          </div>
          <NuxtLink to="/courses" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <span>Lihat Semua</span>
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NuxtLink
            v-for="cat in categories"
            :key="cat.id"
            :to="`/courses?category=${cat.slug}`"
            class="group p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-md transition text-center"
          >
            <div class="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookOpen class="w-6 h-6" />
            </div>
            <h3 class="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition">{{ cat.name }}</h3>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Courses Section -->
    <section class="py-16 bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-2">
              <GraduationCap class="w-4 h-4" />
              <span>KURIKULUM TERBAIK</span>
            </div>
            <h2 class="text-3xl font-bold text-slate-900">Kursus Populer & Terbaru</h2>
            <p class="text-slate-600 text-sm mt-1">Daftar kursus unggulan yang siap membimbing langkah Anda</p>
          </div>
          <NuxtLink
            to="/courses"
            class="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>Jelajahi Semua Kursus</span>
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

        <div v-if="courses && courses.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="course in courses"
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

            <!-- Body -->
            <div class="p-6 flex-1 flex flex-col justify-between">
              <div>
                <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  {{ course.category?.name || 'Umum' }}
                </span>
                <NuxtLink :to="`/courses/${course.slug}`">
                  <h3 class="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2 mt-1">
                    {{ course.title }}
                  </h3>
                </NuxtLink>
                <p class="text-sm text-slate-500 line-clamp-2 mt-2">
                  {{ course.subtitle || course.description }}
                </p>
              </div>

              <!-- Price & CTA -->
              <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <template v-if="course.discount_price && course.discount_price < course.price">
                    <span class="text-xs line-through text-slate-400 block">{{ formatCurrency(course.price) }}</span>
                    <span class="text-lg font-extrabold text-indigo-600">{{ formatCurrency(course.discount_price) }}</span>
                  </template>
                  <template v-else-if="course.price > 0">
                    <span class="text-lg font-extrabold text-indigo-600">{{ formatCurrency(course.price) }}</span>
                  </template>
                  <template v-else>
                    <span class="text-lg font-extrabold text-emerald-600">GRATIS</span>
                  </template>
                </div>

                <NuxtLink
                  :to="`/courses/${course.slug}`"
                  class="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-indigo-600 hover:text-white transition"
                >
                  Detail Kursus
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <BookOpen class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 class="text-lg font-bold text-slate-700">Belum ada kursus yang dipublikasikan</h3>
          <p class="text-sm text-slate-500 mt-1">Nantikan rilis kursus terbaru dari para instruktur kami segera!</p>
        </div>
      </div>
    </section>
  </div>
</template>
