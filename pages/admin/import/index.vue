<script setup lang="ts">
import { ref } from 'vue'
import {
  UploadCloud,
  FileCode,
  Database,
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowRight,
  RefreshCw,
  Layers,
  BookOpen,
  ListOrdered,
  FileQuestion,
  Tag
} from 'lucide-vue-next'
import Swal from 'sweetalert2'

definePageMeta({
  middleware: 'admin'
})

const fileInput = ref<HTMLInputElement | null>(null)
const sqlContent = ref('')
const fileName = ref('')
const fileSize = ref('')
const isAnalyzing = ref(false)
const isImporting = ref(false)
const importResult = ref<any>(null)
const importError = ref('')

// Handle File Selection
const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  fileName.value = file.name
  fileSize.value = (file.size / 1024).toFixed(1) + ' KB'
  importError.value = ''
  importResult.value = null

  const reader = new FileReader()
  reader.onload = (event) => {
    sqlContent.value = event.target?.result as string
  }
  reader.readAsText(file)
}

// Handle Drag & Drop
const onDrop = (e: DragEvent) => {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return

  fileName.value = file.name
  fileSize.value = (file.size / 1024).toFixed(1) + ' KB'
  importError.value = ''
  importResult.value = null

  const reader = new FileReader()
  reader.onload = (event) => {
    sqlContent.value = event.target?.result as string
  }
  reader.readAsText(file)
}

// Execute Import
const executeImport = async () => {
  if (!sqlContent.value || sqlContent.value.trim().length === 0) {
    Swal.fire('File Kosong', 'Harap pilih file SQL atau tempelkan skrip SQL terlebih dahulu.', 'warning')
    return
  }

  const confirm = await Swal.fire({
    title: 'Mulai Import ke Supabase?',
    text: 'Data tabel kursus, modul, pelajaran, kuis, dan voucher dari SQL akan dipetakan dan dimasukkan ke Supabase PostgreSQL.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Jalankan Import',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#4f46e5'
  })

  if (!confirm.isConfirmed) return

  isImporting.value = true
  importError.value = ''
  importResult.value = null

  try {
    const res: any = await $fetch('/api/admin/import-sql', {
      method: 'POST',
      body: {
        sql_content: sqlContent.value
      }
    })

    importResult.value = res
    Swal.fire({
      icon: 'success',
      title: 'Import Berhasil!',
      text: 'Seluruh data SQL berhasil diproses dan masuk ke database Supabase.',
      confirmButtonColor: '#4f46e5'
    })
  } catch (err: any) {
    importError.value = err.data?.statusMessage || 'Gagal melakukan import SQL.'
    Swal.fire('Gagal', importError.value, 'error')
  } finally {
    isImporting.value = false
  }
}

useHead({
  title: 'Import Database MySQL — Admin MIO Learning Academy'
})
</script>

<template>
  <div class="py-10 bg-slate-50 min-h-screen">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 mb-1">
            <Shield class="w-4 h-4" />
            <span>PORTAL ADMIN</span>
          </div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Import Data MySQL ke Supabase</h1>
          <p class="text-xs text-slate-500 mt-1">
            Unggah file backup SQL MySQL dari Laragon/phpMyAdmin untuk ditransfer otomatis ke Supabase PostgreSQL
          </p>
        </div>

        <NuxtLink
          to="/admin/moderation"
          class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition self-start sm:self-auto"
        >
          Kembali ke Moderasi
        </NuxtLink>
      </div>

      <!-- Upload Container -->
      <div class="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <Database class="w-5 h-5 text-indigo-600" />
          <span>Upload File .SQL MySQL</span>
        </h2>

        <!-- Drag & Drop Dropzone -->
        <div
          @dragover.prevent
          @drop="onDrop"
          @click="fileInput?.click()"
          class="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer transition space-y-3"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".sql"
            class="hidden"
            @change="handleFileChange"
          />

          <div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UploadCloud class="w-7 h-7" />
          </div>

          <div>
            <p class="text-sm font-bold text-slate-700">
              {{ fileName ? fileName : 'Pilih atau seret file .sql Anda ke sini' }}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ fileSize ? `Ukuran: ${fileSize}` : 'Mendukung file dump dari phpMyAdmin, HeidiSQL, atau mysqldump' }}
            </p>
          </div>
        </div>

        <!-- Or Paste SQL Text -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Atau Tempelkan Teks Perintah SQL di Bawah Ini:
          </label>
          <textarea
            v-model="sqlContent"
            rows="6"
            placeholder="INSERT INTO `courses` ...&#10;INSERT INTO `categories` ..."
            class="w-full p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
          ></textarea>
        </div>

        <!-- Action Button -->
        <div class="flex items-center justify-between pt-2">
          <span class="text-xs text-slate-400">
            {{ sqlContent ? `${sqlContent.length.toLocaleString('id-ID')} karakter SQL terdeteksi` : 'Menunggu input file SQL' }}
          </span>

          <button
            @click="executeImport"
            :disabled="isImporting || !sqlContent"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition disabled:opacity-50"
          >
            <RefreshCw v-if="isImporting" class="w-4 h-4 animate-spin" />
            <Database v-else class="w-4 h-4" />
            <span>{{ isImporting ? 'Sedang Memproses Import...' : 'Eksekusi Import ke Supabase' }}</span>
          </button>
        </div>
      </div>

      <!-- Import Result Card -->
      <div v-if="importResult" class="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-6">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Ringkasan Data yang Berhasil Diimpor</h2>
            <p class="text-xs text-slate-500">Tabel yang terdeteksi dalam file: {{ importResult.detected_tables?.join(', ') }}</p>
          </div>
        </div>

        <!-- Metric Badges -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div v-if="importResult.summary.categories" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
            <p class="text-2xl font-black text-indigo-600">{{ importResult.summary.categories }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1">Kategori</p>
          </div>

          <div v-if="importResult.summary.courses" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
            <p class="text-2xl font-black text-indigo-600">{{ importResult.summary.courses }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1">Kursus</p>
          </div>

          <div v-if="importResult.summary.sections" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
            <p class="text-2xl font-black text-indigo-600">{{ importResult.summary.sections }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1">Modul Kurikulum</p>
          </div>

          <div v-if="importResult.summary.lessons" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
            <p class="text-2xl font-black text-indigo-600">{{ importResult.summary.lessons }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1">Pelajaran (Video)</p>
          </div>

          <div v-if="importResult.summary.quizzes" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
            <p class="text-2xl font-black text-indigo-600">{{ importResult.summary.quizzes }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1">Kuis</p>
          </div>

          <div v-if="importResult.summary.quiz_questions" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
            <p class="text-2xl font-black text-indigo-600">{{ importResult.summary.quiz_questions }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1">Soal Kuis</p>
          </div>

          <div v-if="importResult.summary.vouchers" class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
            <p class="text-2xl font-black text-indigo-600">{{ importResult.summary.vouchers }}</p>
            <p class="text-xs font-semibold text-slate-600 mt-1">Voucher</p>
          </div>
        </div>

        <!-- Logs output -->
        <div v-if="importResult.logs?.length" class="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100 font-mono text-xs text-slate-700">
          <p v-for="(log, idx) in importResult.logs" :key="idx" class="flex items-center gap-2">
            <span class="text-emerald-500 font-bold">✓</span>
            <span>{{ log }}</span>
          </p>
        </div>

        <div class="flex gap-4 pt-2">
          <NuxtLink
            to="/courses"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
          >
            <span>Lihat Hasil di Katalog Kursus</span>
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
