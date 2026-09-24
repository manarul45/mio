<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  MessageCircle,
  ArrowLeft,
  ShieldCheck,
  FileText,
  BookOpen,
  Play,
} from 'lucide-vue-next'
import type { Order } from '~/types/database.types'

const route = useRoute()
const supabase = useSupabaseClient()
const swal = useSwal()
const orderNumber = route.params.orderNumber as string

const { data: order } = await useAsyncData(`order_invoice_${orderNumber}`, async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items:order_items(
        id, price, discount_price, final_price,
        course:courses(id, title, slug, thumbnail_url, instructor:profiles!courses_instructor_id_fkey(name))
      )
    `)
    .eq('order_number', orderNumber)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Invoice pesanan tidak ditemukan' })
  return data as Order
})

const formatRupiah = (val: number | null | undefined) => {
  if (!val) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const copyText = (text: string, label = 'Teks') => {
  navigator.clipboard.writeText(text)
  swal.toastSuccess(`${label} Disalin!`)
}

const bankInstructions = ref(`Bank Central Asia (BCA): 1234-5678-90
a.n. Manarul Ilmi Online Learning Academy
Bank Mandiri: 9876-5432-10
a.n. PT Manarul Ilmi`)

const adminWhatsappNumber = ref('6281234567890')

onMounted(async () => {
  try {
    const { data: setRes } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['bank_transfer_instructions', 'admin_whatsapp_number'])

    if (setRes) {
      setRes.forEach((item: any) => {
        if (item.key === 'bank_transfer_instructions' && item.value) {
          bankInstructions.value = item.value
        }
        if (item.key === 'admin_whatsapp_number' && item.value) {
          const clean = item.value.replace(/[^0-9]/g, '')
          adminWhatsappNumber.value = clean.startsWith('0') ? '62' + clean.substring(1) : clean
        }
      })
    }
  } catch {}
})

const whatsappConfirmationUrl = computed(() => {
  if (!order.value) return '#'
  const msg = `Halo Admin MIO Learning Academy, saya ingin konfirmasi pembayaran untuk pesanan:
Nomor Order: ${order.value.order_number}
Total Pembayaran: ${formatRupiah(order.value.final_amount)}
Mohon bantu verifikasi dan aktivasi akses kursus saya. Terima kasih!`
  return `https://wa.me/${adminWhatsappNumber.value}?text=${encodeURIComponent(msg)}`
})

useHead({
  title: computed(() => `Invoice #${orderNumber} — MIO Learning Academy`)
})
</script>

<template>
  <div v-if="order" class="min-h-screen bg-slate-50 py-6 sm:py-12 dark:bg-slate-950">
    <div class="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
      <!-- Back Link -->
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
        <NuxtLink
          to="/my-orders"
          class="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800 shrink-0"
          title="Kembali ke Riwayat Pesanan"
        >
          <ArrowLeft class="h-5 w-5" />
        </NuxtLink>
        <div class="min-w-0">
          <h1 class="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">
            Invoice Pembayaran
          </h1>
          <p class="text-xs text-slate-500 hidden sm:block">Rincian pesanan kursus dan konfirmasi WhatsApp.</p>
        </div>
      </div>

      <!-- Top Status Banner -->
      <div
        :class="[
          'rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border',
          order.status === 'paid'
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
            : order.status === 'pending'
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 text-amber-900 dark:text-amber-200'
            : 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 text-rose-900 dark:text-rose-200',
        ]"
      >
        <div class="flex items-center gap-3">
          <div
            :class="[
              'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
              order.status === 'paid'
                ? 'bg-emerald-600 text-white'
                : order.status === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-rose-600 text-white',
            ]"
          >
            <CheckCircle2 v-if="order.status === 'paid'" class="h-5 w-5" />
            <Clock v-else-if="order.status === 'pending'" class="h-5 w-5" />
            <AlertCircle v-else class="h-5 w-5" />
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider block">Status Pesanan</span>
            <p class="text-sm font-black">
              {{ order.status === 'paid' ? 'LUNAS (AKSES AKTIF)' : order.status === 'pending' ? 'MENUNGGU VERIFIKASI ADMIN' : 'DIBATALKAN' }}
            </p>
          </div>
        </div>

        <Button
          v-if="order.status === 'paid' && (order as any).order_items?.[0]?.course?.slug"
          as="NuxtLink"
          :href="`/learning/${(order as any).order_items[0].course.slug}`"
          variant="primary"
          size="sm"
          class="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700"
        >
          <Play class="mr-1.5 h-4 w-4 fill-current" />
          <span>Mulai Belajar</span>
        </Button>
      </div>

      <!-- Invoice Card -->
      <div class="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6 sm:space-y-8">
        <!-- Header: Invoice Meta -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-100 dark:border-slate-800">
          <div class="space-y-1">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nomor Tagihan</span>
            <div class="flex items-center gap-2">
              <h2 class="text-lg sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                #{{ order.order_number }}
              </h2>
              <button
                type="button"
                @click="copyText(order.order_number, 'No. Invoice')"
                class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition dark:bg-slate-800 dark:text-slate-300"
              >
                <Copy class="h-3 w-3" />
                <span>Salin</span>
              </button>
            </div>
            <p class="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Calendar class="h-3.5 w-3.5" />
              <span>{{ formatDate(order.created_at) }}</span>
            </p>
          </div>

          <div class="flex items-center gap-2">
            <Badge :variant="order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'" size="md">
              {{ order.status.toUpperCase() }}
            </Badge>
          </div>
        </div>

        <!-- Bank Instructions if Pending -->
        <div v-if="order.status === 'pending'" class="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-6 dark:border-amber-900/60 dark:bg-amber-950/20 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CreditCard class="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 class="text-sm font-bold text-amber-950 dark:text-amber-200">
                Instruksi Transfer Bank
              </h3>
            </div>
            <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Lakukan Transfer Tepat Sejumlah Tagihan
            </span>
          </div>

          <div class="p-4 rounded-xl bg-white border border-amber-100 dark:bg-slate-900 dark:border-slate-800 font-mono text-xs space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-slate-400 text-[10px]">BANK TUJUAN</p>
                <p class="text-sm font-extrabold text-slate-900 dark:text-white">BCA — 1234-5678-90</p>
                <p class="text-slate-500 text-[11px]">a.n. Manarul Ilmi Online Learning Academy</p>
              </div>
              <button
                type="button"
                @click="copyText('1234567890', 'No. Rekening')"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition dark:bg-slate-800 dark:text-slate-200"
              >
                <Copy class="h-3.5 w-3.5" />
                <span>Salin No. Rek</span>
              </button>
            </div>
          </div>

          <!-- WA Confirmation CTA -->
          <a
            :href="whatsappConfirmationUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition dark:shadow-none"
          >
            <MessageCircle class="h-4 w-4" />
            <span>Kirim Bukti Transfer via WhatsApp Admin</span>
          </a>
        </div>

        <!-- Ordered Items -->
        <div class="space-y-4">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen class="h-4 w-4 text-indigo-600" />
            <span>Item Kursus Yang Dipesan</span>
          </h3>

          <div class="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 rounded-2xl overflow-hidden dark:border-slate-800">
            <div
              v-for="item in (order as any).order_items"
              :key="item.id"
              class="p-4 sm:p-5 flex items-center gap-4 bg-white dark:bg-slate-900"
            >
              <img
                :src="item.course?.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80'"
                :alt="item.course?.title"
                class="h-14 w-20 sm:h-16 sm:w-24 rounded-xl object-cover shrink-0"
              />
              <div class="flex-1 min-w-0">
                <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {{ item.course?.title }}
                </h4>
                <p class="text-[11px] text-slate-400 truncate mt-0.5">
                  Pengajar: {{ item.course?.instructor?.name || 'Senior Instructor' }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <span class="text-sm font-black text-slate-900 dark:text-white">
                  {{ formatRupiah(item.final_price) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Price Breakdown Table -->
        <div class="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-2.5 text-xs">
          <div class="flex justify-between text-slate-500">
            <span>Total Harga Kursus:</span>
            <span class="font-semibold text-slate-700 dark:text-slate-300">{{ formatRupiah(order.total_amount) }}</span>
          </div>
          <div v-if="order.discount_amount && order.discount_amount > 0" class="flex justify-between text-emerald-600 font-semibold">
            <span>Diskon Harga:</span>
            <span>-{{ formatRupiah(order.discount_amount) }}</span>
          </div>
          <div v-if="order.voucher_discount_amount && order.voucher_discount_amount > 0" class="flex justify-between text-purple-600 font-bold">
            <span>Voucher Diskon ({{ order.voucher_code }}):</span>
            <span>-{{ formatRupiah(order.voucher_discount_amount) }}</span>
          </div>
          <div class="flex justify-between text-base font-black text-slate-900 dark:text-white pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>Total Tagihan:</span>
            <span class="text-indigo-600 dark:text-indigo-400">{{ formatRupiah(order.final_amount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
