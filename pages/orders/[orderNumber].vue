<script setup lang="ts">
import { ref } from 'vue'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Building,
  ArrowRight,
  MessageCircle,
  AlertCircle
} from 'lucide-vue-next'
import type { Order } from '~/types/database.types'

const route = useRoute()
const supabase = useSupabaseClient()
const orderNumber = route.params.orderNumber as string
const copied = ref(false)

const { data: order } = await useAsyncData(`order_${orderNumber}`, async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items:order_items(
        id, price, discount_price, final_price,
        course:courses(id, title, slug, thumbnail_url)
      )
    `)
    .eq('order_number', orderNumber)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  return data as Order
})

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => (copied.value = false), 2500)
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val || 0)
}

const whatsappConfirmationLink = computed(() => {
  if (!order.value) return '#'
  const msg = `Halo Admin MIO Academy, saya ingin konfirmasi pembayaran untuk pesanan:
Nomor Order: ${order.value.order_number}
Total: ${formatCurrency(order.value.final_amount)}
Mohon segera diverifikasi. Terima kasih!`
  return `https://wa.me/6281234567890?text=${encodeURIComponent(msg)}`
})

useHead({
  title: computed(() => `Invoice #${orderNumber} — MIO Learning Academy`)
})
</script>

<template>
  <div v-if="order" class="py-12 bg-slate-50 min-h-screen">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Status Header -->
      <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm text-center mb-6">
        <div v-if="order.status === 'pending'" class="inline-flex p-3 rounded-full bg-amber-50 text-amber-600 mb-3">
          <Clock class="w-8 h-8" />
        </div>
        <div v-else-if="order.status === 'paid'" class="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 mb-3">
          <CheckCircle2 class="w-8 h-8" />
        </div>
        <div v-else class="inline-flex p-3 rounded-full bg-rose-50 text-rose-600 mb-3">
          <XCircle class="w-8 h-8" />
        </div>

        <h1 class="text-2xl font-extrabold text-slate-900">
          {{ order.status === 'paid' ? 'Pembayaran Berhasil Diverifikasi!' : 'Menunggu Pembayaran' }}
        </h1>
        <p class="text-xs text-slate-500 mt-1">Nomor Pesanan: <span class="font-mono font-bold text-slate-700">{{ order.order_number }}</span></p>

        <!-- Amount -->
        <div class="my-6 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500">Total Tagihan Transfer:</span>
          <span class="text-xl font-black text-indigo-600">{{ formatCurrency(order.final_amount) }}</span>
        </div>

        <!-- Bank Details if Pending -->
        <div v-if="order.status === 'pending'" class="space-y-4 text-left">
          <div class="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
            <div class="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase">
              <Building class="w-4 h-4" />
              <span>Tujuan Transfer Bank</span>
            </div>
            <div class="flex items-center justify-between pt-1">
              <div>
                <p class="text-xs text-slate-500">Bank Central Asia (BCA)</p>
                <p class="text-base font-extrabold text-slate-900 font-mono">1234-5678-90</p>
                <p class="text-xs text-slate-600">a.n. MIO Learning Academy</p>
              </div>
              <button
                @click="copyToClipboard('1234567890')"
                class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-sm"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ copied ? 'Tersalin!' : 'Salin Rekening' }}</span>
              </button>
            </div>
          </div>

          <!-- WA Confirmation Button -->
          <a
            :href="whatsappConfirmationLink"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-200 transition"
          >
            <MessageCircle class="w-4 h-4" />
            <span>Konfirmasi Bukti Transfer via WhatsApp</span>
          </a>
        </div>

        <!-- Action If Paid -->
        <div v-else-if="order.status === 'paid'" class="space-y-3">
          <NuxtLink
            to="/dashboard"
            class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition"
          >
            <span>Buka Dashboard & Mulai Belajar</span>
            <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>

      <!-- Ordered Items -->
      <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h2 class="text-sm font-bold text-slate-900">Rincian Item Kursus</h2>
        <div v-for="item in order.order_items" :key="item.id" class="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
          <img
            :src="item.course?.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200&auto=format&fit=crop'"
            :alt="item.course?.title"
            class="w-16 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
          />
          <div class="flex-1">
            <h3 class="text-xs font-bold text-slate-900">{{ item.course?.title }}</h3>
            <p class="text-xs text-indigo-600 font-semibold mt-0.5">{{ formatCurrency(item.final_price) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
