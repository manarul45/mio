<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Tag,
  AlertCircle,
  ArrowLeft,
  Building,
  ArrowRight
} from 'lucide-vue-next'
import type { Course } from '~/types/database.types'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { user, profile } = useAuthProfile()
const slug = route.params.slug as string

// Require auth for checkout
definePageMeta({
  middleware: 'auth'
})

const { data: course } = await useAsyncData(`checkout_course_${slug}`, async () => {
  const { data, error } = await supabase
    .from('courses')
    .select('*, instructor:profiles!courses_instructor_id_fkey(name)')
    .eq('slug', slug)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  return data as Course
})

const whatsapp = ref(profile.value?.whatsapp_number || '')
const voucherCode = ref('')
const voucherDiscount = ref(0)
const appliedVoucherCode = ref('')
const voucherMessage = ref('')
const voucherError = ref('')
const isApplyingVoucher = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')

const effectivePrice = computed(() => {
  if (!course.value) return 0
  return course.value.discount_price && course.value.discount_price < course.value.price
    ? course.value.discount_price
    : course.value.price
})

const finalPrice = computed(() => {
  return Math.max(0, effectivePrice.value - voucherDiscount.value)
})

const applyVoucher = async () => {
  if (!voucherCode.value) return
  isApplyingVoucher.value = true
  voucherError.value = ''
  voucherMessage.value = ''

  try {
    const res: any = await $fetch('/api/checkout/apply-voucher', {
      method: 'POST',
      body: {
        code: voucherCode.value,
        amount: effectivePrice.value
      }
    })

    if (res.success) {
      voucherDiscount.value = res.discount_amount
      appliedVoucherCode.value = res.code
      voucherMessage.value = res.message
    }
  } catch (err: any) {
    voucherDiscount.value = 0
    appliedVoucherCode.value = ''
    voucherError.value = err.data?.statusMessage || 'Voucher tidak valid atau tidak dapat digunakan.'
  } finally {
    isApplyingVoucher.value = false
  }
}

const handleCheckout = async () => {
  if (!course.value) return
  isSubmitting.value = true
  submitError.value = ''

  try {
    const res: any = await $fetch('/api/checkout/process', {
      method: 'POST',
      body: {
        course_id: course.value.id,
        voucher_code: appliedVoucherCode.value || null,
        customer_whatsapp: whatsapp.value
      }
    })

    if (res.is_free) {
      router.push(`/learning/${course.value.slug}`)
    } else {
      router.push(`/orders/${res.order_number}`)
    }
  } catch (err: any) {
    submitError.value = err.data?.statusMessage || 'Gagal memproses pesanan. Silakan coba kembali.'
  } finally {
    isSubmitting.value = false
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0)
}

useHead({
  title: 'Checkout Pembayaran — MIO Learning Academy'
})
</script>

<template>
  <div v-if="course" class="py-12 bg-slate-50 min-h-screen">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <NuxtLink :to="`/courses/${course.slug}`" class="inline-flex items-center gap-2 mb-6 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition">
        <ArrowLeft class="w-4 h-4" />
        <span>Kembali ke Detail Kursus</span>
      </NuxtLink>

      <div class="mb-8">
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Selesaikan Pendaftaran Anda</h1>
        <p class="text-sm text-slate-600 mt-1">Satu langkah lagi untuk mulai mempelajari materi kursus pilihan Anda.</p>
      </div>

      <div v-if="submitError" class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm flex items-start gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>{{ submitError }}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <!-- Form Left Column -->
        <div class="md:col-span-7 space-y-6">
          <!-- Customer Info -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 class="text-base font-bold text-slate-900">Informasi Pemesan</h2>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Nama Lengkap</label>
              <input
                :value="profile?.name || user?.email?.split('@')[0]"
                disabled
                class="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Email Akun</label>
              <input
                :value="user?.email"
                disabled
                class="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp Aktif</label>
              <input
                v-model="whatsapp"
                type="tel"
                placeholder="08123456789"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
              <p class="text-[11px] text-slate-400 mt-1">Digunakan untuk notifikasi pendaftaran dan konfirmasi.</p>
            </div>
          </div>

          <!-- Payment Method: Bank Transfer -->
          <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 class="text-base font-bold text-slate-900">Instruksi Pembayaran</h2>

            <div class="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
              <div class="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Building class="w-4 h-4" />
                <span>Transfer Bank BCA (Manual)</span>
              </div>
              <div class="text-xs text-slate-600 space-y-1">
                <p>Nomor Rekening: <span class="font-bold text-slate-900">1234-5678-90</span></p>
                <p>Atas Nama: <span class="font-semibold text-slate-900">MIO Learning Academy</span></p>
              </div>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">
              Setelah menyelesaikan pesanan, Anda dapat mengunggah bukti pembayaran atau konfirmasi via WhatsApp untuk verifikasi kilat oleh admin.
            </p>
          </div>
        </div>

        <!-- Order Summary Right Column -->
        <div class="md:col-span-5 space-y-6">
          <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
            <h2 class="text-base font-bold text-slate-900">Ringkasan Pesanan</h2>

            <!-- Course Snapshot -->
            <div class="flex gap-3 pb-4 border-b border-slate-100">
              <img
                :src="course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop'"
                :alt="course.title"
                class="w-16 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
              />
              <div>
                <h3 class="text-xs font-bold text-slate-900 line-clamp-2">{{ course.title }}</h3>
                <p class="text-[11px] text-slate-500 mt-0.5">Oleh {{ course.instructor?.name }}</p>
              </div>
            </div>

            <!-- Voucher Section -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-700">Kode Promo / Voucher</label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Tag class="w-3.5 h-3.5" />
                  </div>
                  <input
                    v-model="voucherCode"
                    type="text"
                    placeholder="Contoh: DISKON10"
                    class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-medium focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
                <button
                  type="button"
                  @click="applyVoucher"
                  :disabled="isApplyingVoucher || !voucherCode"
                  class="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {{ isApplyingVoucher ? 'Cek...' : 'Terapkan' }}
                </button>
              </div>

              <p v-if="voucherMessage" class="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>{{ voucherMessage }}</span>
              </p>
              <p v-if="voucherError" class="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle class="w-3.5 h-3.5" />
                <span>{{ voucherError }}</span>
              </p>
            </div>

            <!-- Pricing Breakdown -->
            <div class="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div class="flex justify-between">
                <span>Harga Kursus:</span>
                <span class="font-medium text-slate-800">{{ formatCurrency(course.price) }}</span>
              </div>

              <div v-if="course.discount_price && course.discount_price < course.price" class="flex justify-between text-rose-600">
                <span>Potongan Diskon:</span>
                <span>- {{ formatCurrency(course.price - course.discount_price) }}</span>
              </div>

              <div v-if="voucherDiscount > 0" class="flex justify-between text-emerald-600 font-semibold">
                <span>Voucher ({{ appliedVoucherCode }}):</span>
                <span>- {{ formatCurrency(voucherDiscount) }}</span>
              </div>

              <div class="flex justify-between pt-3 border-t border-slate-100 text-sm font-bold text-slate-900">
                <span>Total Tagihan:</span>
                <span class="text-lg text-indigo-600 font-black">{{ formatCurrency(finalPrice) }}</span>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="button"
              @click="handleCheckout"
              :disabled="isSubmitting"
              class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition disabled:opacity-50"
            >
              <span>{{ isSubmitting ? 'Memproses Pesanan...' : 'Konfirmasi & Bayar' }}</span>
              <ArrowRight class="w-4 h-4" />
            </button>

            <div class="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck class="w-4 h-4 text-emerald-500" />
              <span>Transaksi Aman & Terverifikasi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
