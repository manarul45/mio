<script setup lang="ts">
import { ref } from 'vue'
import { LogIn, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const route = useRoute()
const router = useRouter()
const { fetchProfile } = useAuthProfile()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Harap isi email dan kata sandi.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error

    await fetchProfile()
    const redirectUrl = (route.query.redirect as string) || '/dashboard'
    router.push(redirectUrl)
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal masuk akun. Periksa kembali email dan password Anda.'
  } finally {
    loading.value = false
  }
}

useHead({
  title: 'Masuk Akun — MIO Learning Academy'
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
      <div class="text-center">
        <NuxtLink to="/" class="inline-flex items-center gap-2 mb-4 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition">
          <ArrowLeft class="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </NuxtLink>
        <img
          src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
          alt="MIO Logo"
          class="h-14 w-14 mx-auto object-contain rounded-2xl mb-2"
        />
        <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Masuk ke Akun Anda</h2>
        <p class="mt-2 text-sm text-slate-500">
          Belum punya akun?
          <NuxtLink to="/register" class="font-semibold text-indigo-600 hover:text-indigo-500">Daftar sekarang</NuxtLink>
        </p>
      </div>

      <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm flex items-start gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>{{ errorMessage }}</span>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="handleLogin">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">Email</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail class="w-4 h-4" />
            </div>
            <input
              v-model="email"
              type="email"
              required
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm"
              placeholder="nama@email.com"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">Kata Sandi</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock class="w-4 h-4" />
            </div>
            <input
              v-model="password"
              type="password"
              required
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 focus:outline-none transition disabled:opacity-50"
        >
          <LogIn v-if="!loading" class="w-4 h-4" />
          <span>{{ loading ? 'Memproses...' : 'Masuk' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
