<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const courseId = computed(() => (route.query.course_id as string) || '')

const { data, error, pending } = await useFetch<any>(() => `/api/lp/${slug.value}`, {
  query: computed(() => ({ course_id: courseId.value })),
})

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Landing page tidak ditemukan atau belum dipublikasikan.' })
}

useHead({
  title: computed(() => data.value?.landingPage?.name || 'MIO Learning Academy'),
})
</script>

<template>
  <div class="w-full min-h-screen bg-slate-950">
    <div v-if="pending" class="flex items-center justify-center min-h-screen">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
    </div>

    <iframe
      v-else-if="data?.html"
      :srcdoc="data.html"
      class="fixed inset-0 w-screen h-screen border-none z-50 bg-slate-950"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    ></iframe>
  </div>
</template>

<style scoped>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
