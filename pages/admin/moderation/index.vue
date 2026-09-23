<script setup lang="ts">
import { ref } from 'vue'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-vue-next'
import Swal from 'sweetalert2'
import type { Course } from '~/types/database.types'

definePageMeta({
  middleware: 'admin'
})

const supabase = useSupabaseClient()

const { data: submittedCourses, refresh } = await useAsyncData('admin_submitted_courses', async () => {
  const { data } = await supabase
    .from('courses')
    .select('*, instructor:profiles!courses_instructor_id_fkey(name, email), category:categories(name)')
    .in('status', ['submitted', 'in_review', 'draft'])
    .order('created_at', { ascending: false })

  return (data || []) as Course[]
})

const approveCourse = async (course: Course) => {
  const confirm = await Swal.fire({
    title: 'Setujui Kursus?',
    text: `Kursus "${course.title}" akan langsung dipublikasikan ke katalog publik.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Publikasikan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4f46e5'
  })

  if (confirm.isConfirmed) {
    const { error } = await supabase
      .from('courses')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', course.id)

    if (error) {
      Swal.fire('Gagal', error.message, 'error')
    } else {
      Swal.fire('Berhasil!', 'Kursus telah dipublikasikan.', 'success')
      await refresh()
    }
  }
}

const rejectCourse = async (course: Course) => {
  const { value: notes } = await Swal.fire({
    title: 'Tolak atau Minta Revisi',
    input: 'textarea',
    inputLabel: 'Catatan Moderasi untuk Instruktur',
    inputPlaceholder: 'Tuliskan alasan penolakan atau poin yang perlu direvisi...',
    showCancelButton: true,
    confirmButtonText: 'Kirim Penolakan',
    confirmButtonColor: '#e11d48'
  })

  if (notes) {
    const { error } = await supabase
      .from('courses')
      .update({
        status: 'revision_required',
        moderation_notes: notes
      })
      .eq('id', course.id)

    if (error) {
      Swal.fire('Gagal', error.message, 'error')
    } else {
      Swal.fire('Terkirim!', 'Status kursus telah diperbarui ke revisi.', 'info')
      await refresh()
    }
  }
}

useHead({
  title: 'Moderasi Kursus — Admin MIO Learning Academy'
})
</script>

<template>
  <div class="py-10 bg-slate-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-8">
        <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 mb-1">
          <Shield class="w-4 h-4" />
          <span>PORTAL ADMIN</span>
        </div>
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Moderasi & Kurasi Kursus</h1>
        <p class="text-xs text-slate-500 mt-1">Tinjau kurikulum dan setujui penerbitan kursus dari para instruktur</p>
      </div>

      <div v-if="submittedCourses && submittedCourses.length > 0" class="space-y-4">
        <div
          v-for="c in submittedCourses"
          :key="c.id"
          class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-indigo-600 uppercase">{{ c.category?.name }}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700">
                {{ c.status }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-slate-900">{{ c.title }}</h3>
            <p class="text-xs text-slate-500">
              Instruktur: <span class="font-semibold text-slate-700">{{ c.instructor?.name }}</span> ({{ c.instructor?.email }})
            </p>
          </div>

          <div class="flex items-center gap-3">
            <NuxtLink
              :to="`/courses/${c.slug}`"
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
            >
              <Eye class="w-3.5 h-3.5" />
              <span>Pratinjau</span>
            </NuxtLink>

            <button
              @click="approveCourse(c)"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <CheckCircle2 class="w-3.5 h-3.5" />
              <span>Setujui</span>
            </button>

            <button
              @click="rejectCourse(c)"
              class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <XCircle class="w-3.5 h-3.5" />
              <span>Tolak / Revisi</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <Shield class="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 class="text-base font-bold text-slate-700">Tidak ada kursus yang menunggu moderasi</h3>
        <p class="text-xs text-slate-500 mt-1">Semua kursus yang masuk telah ditinjau atau telah dipublikasikan.</p>
      </div>
    </div>
  </div>
</template>
