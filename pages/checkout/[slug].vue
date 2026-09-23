<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import Input from '@/components/UI/Input.vue'
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  MessageCircle,
  User,
  UserCheck,
  Mail,
  Phone,
  Key,
  Info,
  Eye,
  EyeOff,
  Ticket,
} from 'lucide-vue-next'
import type { Course } from '~/types/database.types'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { user, profile, fetchProfile } = useAuthProfile()
const swal = useSwal()
const slug = route.params.slug as string

// Fetch Course
const { data: course } = await useAsyncData(`checkout_course_${slug}`, async () => {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      category:categories(id, name),
      instructor:profiles!courses_instructor_id_fkey(name)
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  return data as Course
})

// Customer info state
const name = ref(profile.value?.name || '')
const email = ref(user.value?.email || '')
const whatsappNumber = ref(profile.value?.whatsapp_number || '')
const password = ref('')
const showPassword = ref(false)

// Voucher state
const voucherInput = ref('')
const appliedVoucher = ref<any>(null)
const voucherError = ref('')
const isApplyingVoucher = ref(false)
const isSubmitting = ref(false)

const effectivePrice = computed(() => {
  if (!course.value) return 0
  return course.value.discount_price && Number(course.discount_price) < Number(course.price)
    ? Number(course.value.discount_price)
    : Number(course.value.price)
})

const courseDiscountAmount = computed(() => {
  if (!course.value) return 0
  if (course.value.discount_price && Number(course.value.discount_price) < Number(course.value.price)) {
    return Number(course.value.price) - Number(course.value.discount_price)
  }
  return 0
})

const finalPrice = computed(() => {
  const vDiscount = appliedVoucher.value?.discount_amount || 0
  return Math.max(0, effectivePrice.value - vDiscount)
})

const bankInstructions = `Bank Central Asia (BCA): 1234-5678-90
a.n. Manarul Ilmi Online Learning Academy
Bank Mandiri: 9876-5432-10
a.n. PT Manarul Ilmi`

const applyVoucherCode = async () => {
  if (!voucherInput.value.trim() || !course.value) return
  isApplyingVoucher.value = true
  voucherError.value = ''

  try {
    const res: any = await $fetch('/api/checkout/apply-voucher', {
      method: 'POST',
      body: {
        code: voucherInput.value.trim(),
        amount: effectivePrice.value,
      }
    })

    if (res.success) {
      appliedVoucher.value = {
        code: res.code,
        discount_amount: res.discount_amount,
        formatted_discount: formatRupiah(res.discount_amount),
      }
      voucherInput.value = ''
      swal.toastSuccess(`Voucher ${res.code} berhasil diterapkan!`)
    }
  } catch (err: any) {
    voucherError.value = err.data?.statusMessage || err.message || 'Kode voucher tidak valid atau kedaluwarsa.'
  } finally {
    isApplyingVoucher.value = false
  }
}

const removeVoucher = () => {
  appliedVoucher.value = null
  voucherError.value = ''
}

const formatRupiah = (val: number | null | undefined) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

const submitPayment = async () => {
  if (!course.value) return
  isSubmitting.value = true

  try {
    // If user is guest, register first
    if (!user.value) {
      if (!name.value || !email.value || !whatsappNumber.value || !password.value) {
        swal.error('Data Belum Lengkap', 'Mohon lengkapi seluruh data nama, email, whatsapp, dan kata sandi.')
        isSubmitting.value = false
        return
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          data: {
            name: name.value,
            whatsapp_number: whatsappNumber.value,
          }
        }
      })

      if (signUpError) throw signUpError
      await fetchProfile()
    }

    // Call checkout process
    const res: any = await $fetch('/api/checkout/process', {
      method: 'POST',
      body: {
        course_id: course.value.id,
        voucher_code: appliedVoucher.value?.code || null,
        customer_whatsapp: whatsappNumber.value || profile.value?.whatsapp_number,
      }
    })

    if (res.is_free) {
      swal.toastSuccess('Pendaftaran berhasil! Selamat belajar.')
      router.push(`/learning/${course.value.slug}`)
    } else {
      router.push(`/orders/${res.order_number}`)
    }
  } catch (err: any) {
    swal.error('Pemesanan Gagal', err.data?.statusMessage || err.message || 'Terjadi kesalahan saat memproses pesanan.')
  } finally {
    isSubmitting.value = false
  }
}

useHead({
  title: computed(() => `Checkout Kursus — ${course.value?.title || 'MIO Learning Academy'}`)
})
</script>

<template>
  <div v-if="course" class="min-h-screen bg-slate-50 py-6 sm:py-12 dark:bg-slate-950">
    <div class="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
      <!-- Back Link -->
      <div class="mb-4 sm:mb-6">
        <NuxtLink
          :to="`/courses/${course.slug}`"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft class="h-4 w-4" />
          <span>Kembali ke Detail Kursus</span>
        </NuxtLink>
      </div>

      <form @submit.prevent="submitPayment">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
          <!-- Left 2 Cols: Customer Information & Payment Methods -->
          <div class="md:col-span-2 space-y-4 sm:space-y-6">
            <!-- Course Item Card -->
            <div class="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3">
                Ringkasan Pesanan Kursus
              </h2>
              <div class="flex gap-3 sm:gap-4 items-center">
                <img
                  :src="course.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80'"
                  :alt="course.title"
                  class="h-16 w-24 sm:h-20 sm:w-32 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                />
                <div class="space-y-1 min-w-0 flex-1">
                  <Badge variant="primary" size="sm">
                    {{ course.category?.name || 'Development' }}
                  </Badge>
                  <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {{ course.title }}
                  </h3>
                  <p class="text-[11px] text-slate-500 truncate">
                    Instruktur: {{ course.instructor?.name || 'Senior Instructor' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Customer Information (Data Pembeli) -->
            <div class="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck v-if="user" class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <User v-else class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Data Pembeli</span>
                </h2>
                <span v-if="user" class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 class="h-3.5 w-3.5" />
                  <span>Akun Terverifikasi</span>
                </span>
              </div>

              <!-- IF LOGGED IN: DISPLAY CLEAN VERIFIED ACCOUNT CARD -->
              <div v-if="user" class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-800 space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div class="space-y-0.5">
                    <span class="text-slate-400 font-medium">Nama Pembeli:</span>
                    <p class="font-bold text-slate-900 dark:text-white text-sm">{{ profile?.name || user.email?.split('@')[0] }}</p>
                  </div>
                  <div class="space-y-0.5">
                    <span class="text-slate-400 font-medium">Alamat Email:</span>
                    <p class="font-semibold text-slate-800 dark:text-slate-200">{{ user.email }}</p>
                  </div>
                </div>

                <!-- WhatsApp number display/input -->
                <div v-if="profile?.whatsapp_number" class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span class="text-slate-400 font-medium">Nomor WhatsApp Aktif:</span>
                  <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ profile.whatsapp_number }}</span>
                </div>
                <div v-else class="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Input
                    v-model="whatsappNumber"
                    label="Nomor WhatsApp Aktif *"
                    placeholder="Contoh: 081234567890"
                    required
                  />
                </div>
              </div>

              <!-- IF GUEST: DISPLAY REGISTRATION FORM -->
              <template v-else>
                <div class="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                  <Info class="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
                  <span>
                    Masukkan data diri dan kata sandi Anda. Akun akan dibuat otomatis untuk mengakses materi kursus.
                  </span>
                </div>

                <div class="space-y-4">
                  <Input
                    v-model="name"
                    label="Nama Lengkap *"
                    placeholder="Contoh: Budi Santoso"
                    required
                  />

                  <Input
                    v-model="email"
                    label="Alamat Email *"
                    type="email"
                    placeholder="budi@example.com"
                    required
                  />

                  <Input
                    v-model="whatsappNumber"
                    label="Nomor WhatsApp Aktif *"
                    placeholder="Contoh: 081234567890"
                    required
                  />

                  <div class="space-y-1">
                    <Input
                      v-model="password"
                      label="Buat Kata Sandi Akun *"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="Masukkan kata sandi (huruf dan angka)"
                      required
                    >
                      <template #suffix>
                        <button
                          type="button"
                          @click="showPassword = !showPassword"
                          class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none"
                          :title="showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'"
                        >
                          <EyeOff v-if="showPassword" class="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <Eye v-else class="h-4 w-4" />
                        </button>
                      </template>
                    </Input>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">
                      *Minimal 6 karakter kombinasi huruf dan angka.
                    </p>
                  </div>
                </div>
              </template>
            </div>

            <!-- Payment Method Selector -->
            <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h2 class="text-base font-bold text-slate-900 dark:text-white">
                Metode Pembayaran
              </h2>

              <div class="space-y-3">
                <!-- WhatsApp & Manual Bank Transfer (Primary) -->
                <div class="cursor-pointer rounded-2xl border p-4 transition flex items-center justify-between border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 dark:bg-emerald-950/30">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                      <MessageCircle class="h-5 w-5" />
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <p class="text-xs font-bold text-slate-900 dark:text-white">Transfer Bank & Konfirmasi WhatsApp</p>
                        <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Rekomendasi
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-500">Dapatkan nomor invoice & kirim bukti transfer langsung ke WhatsApp Admin.</p>
                    </div>
                  </div>
                  <div class="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-600">
                    <div class="h-2.5 w-2.5 rounded-full bg-emerald-600"></div>
                  </div>
                </div>

                <!-- Bank Instructions Preview -->
                <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 font-mono">
                  <p class="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Rekening Tujuan Transfer:</p>
                  <p class="whitespace-pre-line text-xs">{{ bankInstructions }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Col: Price Breakdown & Submit -->
          <div class="space-y-6">
            <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h2 class="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                Rincian Pembayaran
              </h2>

              <div class="space-y-2.5 text-xs">
                <div class="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Harga Normal:</span>
                  <span class="font-semibold">{{ formatRupiah(course.price) }}</span>
                </div>

                <div v-if="courseDiscountAmount > 0" class="flex justify-between text-emerald-600 font-semibold">
                  <span>Diskon Kursus:</span>
                  <span>-{{ formatRupiah(courseDiscountAmount) }}</span>
                </div>

                <div v-if="appliedVoucher" class="flex justify-between text-purple-600 dark:text-purple-400 font-bold">
                  <span>Diskon Voucher ({{ appliedVoucher.code }}):</span>
                  <span>-{{ appliedVoucher.formatted_discount }}</span>
                </div>

                <!-- Voucher Code Input Section -->
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label class="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Ticket class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Kode Voucher Diskon</span>
                  </label>

                  <!-- Applied Voucher Card -->
                  <div v-if="appliedVoucher" class="p-3 rounded-xl bg-purple-50 border border-purple-200 dark:bg-purple-950/60 dark:border-purple-800 flex items-center justify-between">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono font-black text-xs text-purple-800 dark:text-purple-200 bg-purple-200/60 dark:bg-purple-900/80 px-2 py-0.5 rounded">
                          {{ appliedVoucher.code }}
                        </span>
                        <span class="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                          -{{ appliedVoucher.formatted_discount }}
                        </span>
                      </div>
                      <p class="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                        Voucher promo berhasil diterapkan!
                      </p>
                    </div>

                    <button
                      type="button"
                      @click="removeVoucher"
                      class="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                    >
                      Hapus
                    </button>
                  </div>

                  <!-- Voucher Code Form Input -->
                  <div v-else class="flex gap-2">
                    <input
                      v-model="voucherInput"
                      @keyup.enter.prevent="applyVoucherCode"
                      type="text"
                      placeholder="Contoh: DISKON50"
                      class="flex-1 uppercase font-mono text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <Button
                      type="button"
                      @click="applyVoucherCode"
                      :loading="isApplyingVoucher"
                      variant="secondary"
                      size="sm"
                      class="shrink-0 text-xs"
                    >
                      Terapkan
                    </Button>
                  </div>

                  <p v-if="voucherError" class="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {{ voucherError }}
                  </p>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                  <span class="font-bold text-slate-900 dark:text-white text-sm">Total Tagihan:</span>
                  <span class="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {{ formatRupiah(finalPrice) }}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                :loading="isSubmitting"
                variant="primary"
                size="lg"
                class="w-full justify-center mt-4 shadow-lg shadow-emerald-200 dark:shadow-none bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <MessageCircle class="mr-2 h-4 w-4" />
                <span>Beli & Buat Invoice WhatsApp</span>
              </Button>

              <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-500">
                <div class="flex items-center gap-2">
                  <ShieldCheck class="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Proses aman langsung dengan admin resmi</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Akses seumur hidup diaktifkan setelah verifikasi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
