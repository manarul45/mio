<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Button from '~/components/UI/Button.vue'
import Badge from '~/components/UI/Badge.vue'
import LoadingState from '~/components/UI/LoadingState.vue'
import { useToast } from '~/composables/useToast'
import { useSwal } from '~/composables/useSwal'
import {
  Plus,
  FileText,
  Copy,
  Edit3,
  Trash2,
  ExternalLink,
  Search,
  Layout,
  Check,
  Sparkles,
  Home,
  RefreshCw,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
})

const toast = useToast()
const swal = useSwal()

const loading = ref(true)
const landingPages = ref<any[]>([])
const shortcodes = ref<any[]>([])
const searchQuery = ref('')
const copiedCode = ref<string | null>(null)
const actionLoading = ref<number | null>(null)

const fetchLandingPages = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/admin/landing-pages')
    landingPages.value = res.landingPages || []
    shortcodes.value = res.shortcodes || []
  } catch (err: any) {
    toast.error(err.data?.statusMessage || 'Gagal memuat daftar landing page')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLandingPages()
})

const filteredPages = computed(() => {
  if (!searchQuery.value.trim()) return landingPages.value
  const q = searchQuery.value.toLowerCase().trim()
  return landingPages.value.filter(
    (p) => p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q)
  )
})

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  copiedCode.value = text
  toast.success(`Shortcode ${text} disalin!`)
  setTimeout(() => {
    copiedCode.value = null
  }, 2000)
}

const duplicatePage = async (id: number) => {
  const result = await swal.confirm(
    'Duplikasi Landing Page',
    'Salin landing page / template ini ke dalam halaman baru?',
    'Ya, Salin',
    'question'
  )
  if (!result.isConfirmed) return

  actionLoading.value = id
  try {
    const res: any = await $fetch(`/api/admin/landing-pages/${id}/duplicate`, { method: 'POST' })
    toast.success('Landing page berhasil disalin!')
    if (res.landingPage?.id) {
      navigateTo(`/admin/landing-pages/${res.landingPage.id}`)
    } else {
      fetchLandingPages()
    }
  } catch (err: any) {
    toast.error(err.data?.statusMessage || 'Gagal menduplikasi landing page')
  } finally {
    actionLoading.value = null
  }
}

const setAsHomepage = async (id: number, name: string) => {
  const result = await swal.confirm(
    'Jadikan Halaman Utama (Homepage)',
    `Jadikan "${name}" sebagai Tampilan Utama Homepage ( Halaman Depan / )?`,
    'Ya, Jadikan Utama',
    'question'
  )
  if (!result.isConfirmed) return

  actionLoading.value = id
  try {
    await $fetch(`/api/admin/landing-pages/${id}/set-homepage`, { method: 'POST' })
    toast.success(`"${name}" berhasil dijadikan Tampilan Utama Homepage!`)
    fetchLandingPages()
  } catch (err: any) {
    toast.error(err.data?.statusMessage || 'Gagal mengatur homepage')
  } finally {
    actionLoading.value = null
  }
}

const deletePage = async (id: number, name: string) => {
  const result = await swal.confirm(
    'Hapus Landing Page',
    `Apakah Anda yakin ingin menghapus "${name}" secara permanen?`,
    'Ya, Hapus',
    'warning'
  )
  if (!result.isConfirmed) return

  actionLoading.value = id
  try {
    await $fetch(`/api/admin/landing-pages/${id}`, { method: 'DELETE' })
    toast.success('Landing page berhasil dihapus')
    fetchLandingPages()
  } catch (err: any) {
    toast.error(err.data?.statusMessage || 'Gagal menghapus landing page')
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Layout class="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          <span>Landing Page System</span>
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Sistem landing page mandiri berbasis Code Editor HTML/CSS/JS + Whitelisted Dynamic Shortcodes.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button variant="secondary" size="md" @click="fetchLandingPages" :disabled="loading">
          <RefreshCw class="mr-1.5 h-4 w-4" :class="{ 'animate-spin': loading }" />
          <span>Segarkan</span>
        </Button>

        <NuxtLink to="/admin/landing-pages/create">
          <Button variant="primary" size="md">
            <Plus class="mr-1.5 h-4 w-4" />
            <span>Buat Landing Page Baru</span>
          </Button>
        </NuxtLink>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative max-w-md">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari landing page berdasarkan nama atau slug..."
        class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>

    <!-- Main Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Landing Pages List (2 Columns) -->
      <div class="lg:col-span-2 space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
          <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">
              Daftar Landing Page & Template ({{ filteredPages.length }})
            </h2>
          </div>

          <LoadingState v-if="loading" message="Memuat daftar landing page..." />

          <div v-else-if="filteredPages.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800">
            <div
              v-for="item in filteredPages"
              :key="item.id"
              class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-bold text-slate-900 dark:text-white">
                    {{ item.name }}
                  </h3>

                  <span
                    v-if="item.is_homepage"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-xs animate-pulse"
                  >
                    <Home class="h-3 w-3 text-amber-500 fill-current" />
                    ⭐ HOMEPAGE UTAMA ( / )
                  </span>

                  <span
                    v-if="item.is_template"
                    class="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    <Sparkles class="h-3 w-3" />
                    Template
                  </span>

                  <Badge :variant="item.status === 'published' ? 'success' : 'warning'" size="xs">
                    {{ item.status === 'published' ? 'PUBLISHED' : 'DRAFT' }}
                  </Badge>
                </div>

                <p class="text-xs text-slate-400 font-mono">
                  /lp/{{ item.slug }}
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-if="!item.is_homepage"
                  type="button"
                  @click="setAsHomepage(item.id, item.name)"
                  :disabled="actionLoading === item.id"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 transition-colors shadow-xs disabled:opacity-50"
                  title="Jadikan Landing Page ini Tampilan Utama (Homepage /)"
                >
                  <Home class="h-3.5 w-3.5" />
                  <span>Set Homepage</span>
                </button>

                <a
                  v-if="item.status === 'published'"
                  :href="item.is_homepage ? '/' : `/lp/${item.slug}`"
                  target="_blank"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  title="Buka Halaman Publik"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                  <span>Lihat</span>
                </a>

                <button
                  type="button"
                  @click="duplicatePage(item.id)"
                  :disabled="actionLoading === item.id"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  title="Gunakan sebagai Template / Duplikasi"
                >
                  <Copy class="h-3.5 w-3.5" />
                  <span>Salin</span>
                </button>

                <NuxtLink :to="`/admin/landing-pages/${item.id}`">
                  <button
                    type="button"
                    class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    title="Edit Code & Metadata"
                  >
                    <Edit3 class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  </button>
                </NuxtLink>

                <button
                  type="button"
                  @click="deletePage(item.id, item.name)"
                  :disabled="actionLoading === item.id"
                  class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                  title="Hapus Landing Page"
                >
                  <Trash2 class="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="p-12 text-center text-slate-400 text-xs">
            Belum ada landing page yang dibuat atau cocok dengan pencarian. Klik tombol "Buat Landing Page Baru" di atas.
          </div>
        </div>
      </div>

      <!-- Shortcode Documentation Sidebar (1 Column) -->
      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText class="h-4 w-4 text-indigo-500" />
              <span>Shortcode Whitelist</span>
            </h3>
            <span class="text-[11px] font-semibold text-slate-400">Dynamic Replacement</span>
          </div>

          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Salin shortcode berikut lalu tempel di dalam Code Editor HTML landing page Anda:
          </p>

          <div class="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            <div
              v-for="sc in shortcodes"
              :key="sc.code"
              class="p-2.5 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-800/50 flex items-center justify-between gap-2"
            >
              <div>
                <code class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {{ sc.code }}
                </code>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {{ sc.description }}
                </p>
              </div>

              <button
                @click="copyToClipboard(sc.code)"
                type="button"
                class="shrink-0 p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 transition-all text-xs flex items-center gap-1"
              >
                <Check v-if="copiedCode === sc.code" class="h-3.5 w-3.5 text-emerald-500" />
                <Copy v-else class="h-3.5 w-3.5" />
                <span class="text-[10px] font-semibold">
                  {{ copiedCode === sc.code ? 'Copied' : 'Copy' }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
