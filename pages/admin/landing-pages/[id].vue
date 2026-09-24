<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Button from '~/components/UI/Button.vue'
import LoadingState from '~/components/UI/LoadingState.vue'
import { useToast } from '~/composables/useToast'
import {
  ArrowLeft,
  Save,
  Eye,
  Copy,
  Check,
  Code,
  Sparkles,
  FileCode2,
  X,
  ExternalLink,
} from 'lucide-vue-next'

import { DEFAULT_LANDING_PAGE_TEMPLATE } from '~/utils/landingPageTemplate'

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const id = computed(() => route.params.id as string)
const isNew = computed(() => id.value === 'new' || id.value === 'create')

const loading = ref(true)
const saving = ref(false)
const shortcodes = ref<any[]>([])
const courses = ref<any[]>([])

const form = ref({
  name: '',
  slug: '',
  status: 'draft',
  is_template: false,
  content: '',
})

const defaultStarter = DEFAULT_LANDING_PAGE_TEMPLATE


const copiedCode = ref<string | null>(null)
const isPreviewModalOpen = ref(false)
const previewHtml = ref('')
const isPreviewLoading = ref(false)
const selectedCourseId = ref('')

const fetchData = async () => {
  loading.value = true
  try {
    if (isNew.value) {
      // Get shortcodes and courses from preview or list endpoint
      const listRes: any = await $fetch('/api/admin/landing-pages')
      shortcodes.value = listRes.shortcodes || []

      // Also get courses
      const coursesRes: any = await $fetch('/api/courses')
      courses.value = coursesRes.courses || []

      form.value.content = defaultStarter
    } else {
      const res: any = await $fetch(`/api/admin/landing-pages/${id.value}`)
      const lp = res.landingPage
      form.value.name = lp.name || ''
      form.value.slug = lp.slug || ''
      form.value.status = lp.status || 'draft'
      form.value.is_template = Boolean(lp.is_template)
      form.value.content = lp.content || defaultStarter
      shortcodes.value = res.shortcodes || []
      courses.value = res.courses || []
    }
  } catch (err: any) {
    toast.error(err.data?.statusMessage || 'Gagal memuat data landing page')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const copyShortcode = (code: string) => {
  navigator.clipboard.writeText(code)
  copiedCode.value = code
  toast.success(`Disalin: ${code}`)
  setTimeout(() => {
    copiedCode.value = null
  }, 2000)
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    toast.error('Nama landing page wajib diisi')
    return
  }

  saving.value = true
  try {
    if (isNew.value) {
      const res: any = await $fetch('/api/admin/landing-pages', {
        method: 'POST',
        body: form.value,
      })
      toast.success('Landing page berhasil dibuat!')
      router.push(`/admin/landing-pages/${res.landingPage.id}`)
    } else {
      await $fetch(`/api/admin/landing-pages/${id.value}`, {
        method: 'PUT',
        body: form.value,
      })
      toast.success('Landing page berhasil diperbarui!')
    }
  } catch (err: any) {
    toast.error(err.data?.statusMessage || 'Gagal menyimpan landing page')
  } finally {
    saving.value = false
  }
}

const handlePreview = async () => {
  isPreviewLoading.value = true
  isPreviewModalOpen.value = true
  try {
    const res: any = await $fetch('/api/admin/landing-pages/preview', {
      method: 'POST',
      body: {
        content: form.value.content,
        course_id: selectedCourseId.value || undefined,
      },
    })
    previewHtml.value = res.html
  } catch (err: any) {
    previewHtml.value = `<div style="color:red; padding: 20px; font-family: sans-serif;">Gagal memuat pratinjau: ${err.message}</div>`
  } finally {
    isPreviewLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <LoadingState v-if="loading" message="Menyiapkan code editor..." />

    <template v-else>
      <!-- Navigation Back & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin/landing-pages">
            <Button variant="ghost" size="sm">
              <ArrowLeft class="h-4 w-4" />
            </Button>
          </NuxtLink>
          <div>
            <h1 class="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode2 class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <span>{{ isNew ? 'Buat Landing Page Baru' : `Edit: ${form.name}` }}</span>
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Editor mandiri HTML + CSS + JavaScript dengan substitusi dynamic shortcodes.
            </p>
          </div>
        </div>

        <!-- Action Buttons Header -->
        <div class="flex items-center gap-3">
          <Button @click="handlePreview" type="button" variant="secondary" size="md">
            <Eye class="mr-1.5 h-4 w-4" />
            <span>Pratinjau (Preview)</span>
          </Button>

          <Button @click="handleSave" type="button" variant="primary" size="md" :disabled="saving">
            <Save class="mr-1.5 h-4 w-4" />
            <span>{{ saving ? 'Menyimpan...' : 'Simpan Landing Page' }}</span>
          </Button>
        </div>
      </div>

      <!-- Form Metadata (Name, Slug, Status, Is Template) -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Landing Page <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Promo Spesial Ramadhan"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Slug URL <span class="text-slate-400">(Otomatis jika kosong)</span>
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-3 text-xs font-mono text-slate-400">/lp/</span>
              <input
                v-model="form.slug"
                type="text"
                placeholder="promo-spesial-ramadhan"
                class="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Status Publikasi
            </label>
            <select
              v-model="form.status"
              class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
            >
              <option value="draft">DRAFT (Belum Dipublikasikan)</option>
              <option value="published">PUBLISHED (Aktif di Halaman Publik)</option>
            </select>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <label class="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
            <input
              v-model="form.is_template"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <span>Simpan sebagai Template untuk digunakan kembali</span>
          </label>
        </div>
      </div>

      <!-- Main Code Editor & Shortcodes Sidebar Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <!-- Single Code Editor (3 Columns) -->
        <div class="lg:col-span-3 space-y-2">
          <div class="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            <!-- Editor Toolbar -->
            <div class="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Code class="h-4 w-4 text-emerald-400" />
                <span class="text-xs font-mono font-bold text-slate-200">
                  HTML + CSS + JavaScript Code Editor
                </span>
              </div>
              <span class="text-[10px] font-mono text-slate-400">Tulis seluruh &lt;style&gt;, HTML, dan &lt;script&gt; di sini</span>
            </div>

            <!-- Code Textarea -->
            <textarea
              v-model="form.content"
              rows="26"
              spellcheck="false"
              class="w-full bg-slate-950 p-4 font-mono text-xs text-emerald-300 leading-relaxed focus:outline-none resize-y border-none font-medium"
              placeholder="<!DOCTYPE html>&#10;<html>&#10;<head>&#10;  <style>/* CSS */</style>&#10;</head>&#10;<body>&#10;  <h1>{{course_title}}</h1>&#10;  <script>/* JS */</script>&#10;</body>&#10;</html>"
            ></textarea>
          </div>
        </div>

        <!-- Shortcode Reference Sidebar (1 Column) -->
        <div class="space-y-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles class="h-4 w-4 text-indigo-500" />
              <span>Shortcodes Docs</span>
            </h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Klik <strong>Copy</strong> lalu tempelkan ke dalam Code Editor:
            </p>

            <div class="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              <div
                v-for="sc in shortcodes"
                :key="sc.code"
                class="p-2.5 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 space-y-1.5"
              >
                <div class="flex items-center justify-between">
                  <code class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {{ sc.code }}
                  </code>

                  <button
                    @click="copyShortcode(sc.code)"
                    type="button"
                    class="p-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                  >
                    <Check v-if="copiedCode === sc.code" class="h-3 w-3 text-emerald-500" />
                    <Copy v-else class="h-3 w-3" />
                    <span>{{ copiedCode === sc.code ? 'Copied' : 'Copy' }}</span>
                  </button>
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-400">
                  {{ sc.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Live Preview Modal -->
    <div v-if="isPreviewModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div class="relative w-full max-w-5xl h-[85vh] rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div class="flex items-center gap-3">
            <Eye class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                Live Preview Landing Page
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">
                Hasil substitusi shortcode menggunakan data sampel atau data kursus terdaftar.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Select course for sample preview -->
            <select
              v-model="selectedCourseId"
              @change="handlePreview"
              class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
            >
              <option value="">Gunakan Data Sampel Default</option>
              <option v-for="c in courses" :key="c.id" :value="c.id">
                Kursus: {{ c.title }}
              </option>
            </select>

            <button
              @click="isPreviewModalOpen = false"
              class="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Preview Content Body / iFrame Frame -->
        <div class="flex-1 bg-white relative overflow-hidden">
          <div v-if="isPreviewLoading" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80">
            <span class="text-xs font-semibold text-indigo-600 animate-pulse">Memuat pratinjau...</span>
          </div>

          <iframe
            v-else
            :srcdoc="previewHtml"
            class="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-950 shrink-0">
          <Button type="button" @click="isPreviewModalOpen = false" variant="secondary" size="sm">
            Tutup Preview
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
