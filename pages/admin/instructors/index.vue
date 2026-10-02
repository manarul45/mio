<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from '~/components/UI/Button.vue'
import Input from '~/components/UI/Input.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'dashboard',
})

const supabase = useSupabaseClient()
const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const names = ref<string[]>([])
const newName = ref('')

const authHeaders = async () => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const loadNames = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/admin/instructor-names', { headers: await authHeaders() })
    names.value = res.names || []
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Gagal memuat nama pengajar.')
  } finally {
    loading.value = false
  }
}

const addName = async () => {
  const name = newName.value.trim()
  if (!name) return
  saving.value = true
  try {
    const res: any = await $fetch('/api/admin/instructor-names', {
      method: 'POST',
      headers: await authHeaders(),
      body: { action: 'add', name },
    })
    names.value = res.names || []
    newName.value = ''
    toast.success('Nama pengajar ditambahkan.')
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Gagal menambah nama.')
  } finally {
    saving.value = false
  }
}

const removeName = async (name: string) => {
  saving.value = true
  try {
    const res: any = await $fetch('/api/admin/instructor-names', {
      method: 'POST',
      headers: await authHeaders(),
      body: { action: 'remove', name },
    })
    names.value = res.names || []
    toast.success('Nama pengajar dihapus dari daftar.')
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Gagal menghapus nama.')
  } finally {
    saving.value = false
  }
}

onMounted(loadNames)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Nama Pengajar</h1>
      <p class="mt-1 text-sm text-slate-500">
        Daftar ini dipakai saat membuat kursus. Pengajar tidak perlu akun login. Yang masuk tetap akun admin.
      </p>
    </div>

    <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="addName">
      <div class="flex-1">
        <Input v-model="newName" label="Nama lengkap pengajar" placeholder="Contoh: Baskah Firmansyah Bakhtiar" />
      </div>
      <div class="sm:pt-6">
        <Button type="submit" variant="primary" :disabled="saving || !newName.trim()">Tambah</Button>
      </div>
    </form>

    <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      Memuat daftar...
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="name in names"
        :key="name"
        class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ name }}</p>
        <Button type="button" variant="secondary" size="sm" :disabled="saving" @click="removeName(name)">Hapus</Button>
      </div>
    </div>
  </div>
</template>
