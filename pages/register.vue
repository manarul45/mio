<script setup lang="ts">
import { ref } from 'vue'
import { UserPlus, Mail, Lock, User, Phone, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-vue-next'

const supabase = useSupabaseClient()
const router = useRouter()

const name = ref('')
const email = ref('')
const whatsappNumber = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleRegister = async () => {
  if (password.value !== passwordConfirmation.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          name: name.value,
          whatsapp_number: whatsappNumber.value,
          role: 'STUDENT'
        }
      }
    })

    if (error) throw error

    if (data.session) {
      router.push('/dashboard')
    } else {
      successMessage.value = 'Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi atau langsung login jika konfirmasi email dinonaktifkan.'
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Gagal mendaftar. Silakan coba kembali.'
  } finally {
    loading.value = false
  }
}

useHead({
  title: 'Daftar Akun Baru — MIO Learning Academy'
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
        <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Buat Akun Baru</h2>
        <p class="mt-2 text-sm text-slate-500">
          Sudah memiliki akun?
          <NuxtLink to="/login" class="font-semibold text-indigo-600 hover:text-indigo-500">Masuk di sini</NuxtLink>
        </p>
      </div>

      <div v-if="errorMessage" class="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm flex items-start gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-start gap-3">
        <CheckCircle2 class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>{{ successMessage }}</span>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="handleRegister">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User class="w-4 h-4" />
            </div>
            <input
              v-model="name"
              type="text"
              required
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm"
              placeholder="Nama lengkap Anda"
            />
          </div>
        </div>

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
          <label class="block text-sm font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone class="w-4 h-4" />
            </div>
            <input
              v-model="whatsappNumber"
              type="tel"
              required
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm"
              placeholder="08123456789"
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
              minlength="6"
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm"
              placeholder="Minimal 6 karakter"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock class="w-4 h-4" />
            </div>
            <input
              v-model="passwordConfirmation"
              type="password"
              required
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm"
              placeholder="Ulangi kata sandi"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 focus:outline-none transition disabled:opacity-50 mt-2"
        >
          <UserPlus v-if="!loading" class="w-4 h-4" />
          <span>{{ loading ? 'Memproses...' : 'Daftar Sekarang' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
