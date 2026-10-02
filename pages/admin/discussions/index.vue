<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from '~/components/UI/Button.vue'
import { useToast } from '~/composables/useToast'
import { HelpCircle, ExternalLink } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
})

const supabase = useSupabaseClient()
const toast = useToast()

const loading = ref(true)
const questions = ref<any[]>([])
const drafts = ref<Record<number, string>>({})
const sending = ref<Record<number, boolean>>({})
const closing = ref<Record<number, boolean>>({})

const authHeaders = async () => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const loadQuestions = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/admin/discussions', { headers: await authHeaders() })
    questions.value = res.questions || []
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Gagal memuat pertanyaan.')
  } finally {
    loading.value = false
  }
}

const sendReply = async (question: any) => {
  const text = drafts.value[question.id]?.trim()
  if (!text) return
  sending.value[question.id] = true
  try {
    const res: any = await $fetch(`/api/discussions/${question.id}/reply`, {
      method: 'POST',
      headers: await authHeaders(),
      body: { content: text },
    })
    if (!question.replies) question.replies = []
    question.replies.push(res.reply)
    drafts.value[question.id] = ''
    toast.success('Jawaban terkirim. Pertanyaan ini masih terbuka sampai Anda menandai selesai.')
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Gagal mengirim jawaban.')
  } finally {
    sending.value[question.id] = false
  }
}

const markDone = async (question: any) => {
  closing.value[question.id] = true
  try {
    await $fetch(`/api/discussions/${question.id}/resolve`, {
      method: 'POST',
      headers: await authHeaders(),
    })
    questions.value = questions.value.filter((item) => item.id !== question.id)
    toast.success('Pertanyaan ditandai selesai.')
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Gagal menutup pertanyaan.')
  } finally {
    closing.value[question.id] = false
  }
}

const formatWhen = (value: string) => new Date(value).toLocaleString('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

onMounted(loadQuestions)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Pertanyaan belum dijawab</h1>
      <p class="mt-1 text-sm text-slate-500">
        Semua pertanyaan dari forum di bawah video. Jawab di sini, lalu tandai selesai bila urusan itu sudah beres.
      </p>
    </div>

    <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      Memuat pertanyaan...
    </div>

    <div v-else-if="questions.length === 0" class="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
      Belum ada pertanyaan yang menunggu jawaban.
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="question in questions"
        :key="question.id"
        class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              {{ question.course_title }}
            </p>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">{{ question.title }}</h2>
            <p class="text-xs text-slate-500">
              Video: {{ question.lesson_title }} · {{ question.student_name }} · {{ formatWhen(question.created_at) }}
            </p>
          </div>
          <NuxtLink
            v-if="question.course_slug && question.lesson_id"
            :to="`/learning/${question.course_slug}?lesson=${question.lesson_id}&tab=qa`"
            class="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600"
          >
            <ExternalLink class="h-3.5 w-3.5" />
            <span>Buka video</span>
          </NuxtLink>
        </div>

        <p class="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">{{ question.content }}</p>

        <div v-if="question.replies?.length" class="space-y-2 border-l-2 border-emerald-200 pl-4 dark:border-emerald-900">
          <p
            v-for="reply in question.replies"
            :key="reply.id"
            class="text-sm text-slate-600 dark:text-slate-300"
          >
            <span class="font-semibold text-emerald-700 dark:text-emerald-300">Jawaban pengajar:</span>
            {{ reply.content }}
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <input
            v-model="drafts[question.id]"
            type="text"
            placeholder="Tulis jawaban untuk siswa..."
            class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            @keyup.enter="sendReply(question)"
          />
          <Button type="button" variant="primary" size="sm" :disabled="sending[question.id] || !drafts[question.id]?.trim()" @click="sendReply(question)">
            {{ sending[question.id] ? 'Mengirim...' : 'Kirim jawaban' }}
          </Button>
          <Button type="button" variant="secondary" size="sm" :disabled="closing[question.id]" @click="markDone(question)">
            <HelpCircle class="mr-1.5 h-3.5 w-3.5" />
            {{ closing[question.id] ? 'Menutup...' : 'Tandai selesai' }}
          </Button>
        </div>
      </article>
    </div>
  </div>
</template>
