<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useSwal, Swal } from '~/composables/useSwal';
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    CheckCircle2,
    XCircle,
    Copy,
    MessageCircle,
    Clock,
    Phone,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const orders = ref<any[]>([]);
const currentStatus = ref('all');

const formatRupiah = (val: number) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(val);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const loadOrders = async () => {
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                total_amount,
                final_amount,
                status,
                customer_whatsapp,
                created_at,
                profiles:user_id(id, name, email),
                order_items(
                    id,
                    courses:course_id(id, title)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        orders.value = (data || []).map((o: any) => ({
            id: o.id,
            order_number: o.order_number,
            total_amount: o.total_amount,
            final_amount: o.final_amount,
            status: o.status,
            customer_whatsapp: o.customer_whatsapp,
            created_at: o.created_at,
            user: o.profiles,
            items: (o.order_items || []).map((item: any) => ({
                id: item.id,
                course: item.courses,
            })),
        }));
    } catch (err: any) {
        console.error('Failed to load orders:', err);
    } finally {
        loading.value = false;
    }
};

const stats = computed(() => {
    let revenue = 0;
    let pendingCount = 0;
    let paidCount = 0;

    orders.value.forEach(o => {
        if (o.status === 'paid') {
            revenue += Number(o.final_amount || o.total_amount) || 0;
            paidCount++;
        } else if (o.status === 'pending') {
            pendingCount++;
        }
    });

    return {
        total_revenue: revenue,
        pending_count: pendingCount,
        paid_count: paidCount,
    };
});

const filteredOrders = computed(() => {
    if (currentStatus.value === 'all') return orders.value;
    return orders.value.filter(o => o.status === currentStatus.value);
});

const approveOrder = async (order: any) => {
    const isConfirmed = await swal.confirmDialog({
        title: 'Approve Pembelian Kursus?',
        text: `Pesanan #${order.order_number} atas nama "${order.user?.name}" akan disetujui dan akses materi kursus akan langsung diaktifkan.`,
        confirmButtonText: 'Ya, Approve Sekarang!',
        confirmButtonColor: '#059669',
    });

    if (!isConfirmed) return;

    try {
        // 1. Update order status to 'paid'
        const { error: ordErr } = await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', order.id);

        if (ordErr) throw ordErr;

        // 2. Grant course enrollment to user for each course in order
        if (order.user?.id && order.items?.length) {
            for (const item of order.items) {
                if (item.course?.id) {
                    await supabase
                        .from('enrollments')
                        .upsert({
                            user_id: order.user.id,
                            course_id: item.course.id,
                            progress_percentage: 0,
                            enrolled_at: new Date().toISOString(),
                        }, { onConflict: 'user_id,course_id' });
                }
            }
        }

        swal.fireSuccess('Pembayaran Disetujui!', `Akses kursus untuk ${order.user?.name} telah aktif.`);
        loadOrders();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menyetujui pesanan.');
    }
};

const rejectOrder = async (order: any) => {
    const isConfirmed = await swal.confirmDialog({
        title: 'Batalkan Pesanan?',
        text: `Pesanan #${order.order_number} akan dibatalkan.`,
        confirmButtonText: 'Batalkan Pesanan',
        confirmButtonColor: '#ef4444',
    });

    if (!isConfirmed) return;

    try {
        await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', order.id);

        swal.toastSuccess('Pesanan berhasil dibatalkan.');
        loadOrders();
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

const openWhatsApp = (phone: string, order: any) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const msg = encodeURIComponent(`Halo ${order.user?.name || ''}, kami dari MIO Learning Academy ingin mengonfirmasi pesanan #${order.order_number}.`);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
};

onMounted(() => {
    loadOrders();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Laporan Keuangan & Approval
                </h1>
                <p class="text-xs text-slate-500">Pusat approval pembayaran manual, monitoring omzet, dan invoice pesanan.</p>
            </div>

            <Button variant="secondary" size="md" @click="loadOrders">
                <span>Refresh Transaksi</span>
            </Button>
        </div>

        <div class="space-y-6">
            <!-- Stats Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                        <TrendingUp class="h-5 w-5" />
                    </div>
                    <div>
                        <span class="text-xs font-semibold text-slate-400">Total Omzet Lunas</span>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {{ formatRupiah(stats.total_revenue) }}
                        </p>
                    </div>
                </div>

                <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                        <Clock class="h-5 w-5" />
                    </div>
                    <div>
                        <span class="text-xs font-semibold text-slate-400">Menunggu Approval</span>
                        <p class="text-2xl font-black text-amber-600 mt-0.5">
                            {{ stats.pending_count }} Pesanan
                        </p>
                    </div>
                </div>

                <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                        <CheckCircle2 class="h-5 w-5" />
                    </div>
                    <div>
                        <span class="text-xs font-semibold text-slate-400">Transaksi Selesai</span>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {{ stats.paid_count }} Transaksi
                        </p>
                    </div>
                </div>
            </div>

            <!-- Orders Table Section -->
            <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <!-- Status Filter Chips -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        v-for="s in [
                            { key: 'all', label: 'Semua Pesanan' },
                            { key: 'pending', label: 'Menunggu Approval' },
                            { key: 'paid', label: 'Lunas' },
                            { key: 'cancelled', label: 'Dibatalkan' }
                        ]"
                        :key="s.key"
                        type="button"
                        @click="currentStatus = s.key"
                        :class="[
                            'px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                            currentStatus === s.key
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                        ]"
                    >
                        {{ s.label }}
                    </button>
                </div>

                <div v-if="loading" class="py-12">
                    <LoadingState text="Memuat data pesanan..." />
                </div>

                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-6 py-4">No. Order & Tanggal</th>
                                <th class="px-6 py-4">Pelanggan</th>
                                <th class="px-6 py-4">Kursus</th>
                                <th class="px-6 py-4">Total Bayar</th>
                                <th class="px-6 py-4">Status</th>
                                <th class="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="order in filteredOrders" :key="order.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td class="px-6 py-4">
                                    <p class="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{{ order.order_number }}</p>
                                    <p class="text-[11px] text-slate-400 mt-0.5">{{ formatDate(order.created_at) }}</p>
                                </td>
                                <td class="px-6 py-4">
                                    <p class="font-bold text-slate-900 dark:text-white">{{ order.user?.name || 'Customer' }}</p>
                                    <p class="text-[11px] text-slate-400">{{ order.customer_whatsapp || order.user?.email || '-' }}</p>
                                </td>
                                <td class="px-6 py-4 max-w-xs truncate text-slate-700 dark:text-slate-300">
                                    {{ order.items?.[0]?.course?.title || 'Kursus' }}
                                </td>
                                <td class="px-6 py-4 font-black text-slate-900 dark:text-white">
                                    {{ formatRupiah(order.final_amount || order.total_amount) }}
                                </td>
                                <td class="px-6 py-4">
                                    <Badge
                                        :variant="order.status === 'paid' ? 'success' : (order.status === 'pending' ? 'warning' : 'danger')"
                                        size="sm"
                                    >
                                        {{ order.status === 'paid' ? 'LUNAS' : (order.status === 'pending' ? 'PENDING' : 'DIBATALKAN') }}
                                    </Badge>
                                </td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button
                                        v-if="order.customer_whatsapp"
                                        type="button"
                                        @click="openWhatsApp(order.customer_whatsapp, order)"
                                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold"
                                        title="Chat WhatsApp"
                                    >
                                        <MessageCircle class="h-3.5 w-3.5" />
                                        <span>WA</span>
                                    </button>

                                    <button
                                        v-if="order.status === 'pending'"
                                        type="button"
                                        @click="approveOrder(order)"
                                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm"
                                    >
                                        <CheckCircle2 class="h-3.5 w-3.5" />
                                        <span>Approve</span>
                                    </button>

                                    <button
                                        v-if="order.status === 'pending'"
                                        type="button"
                                        @click="rejectOrder(order)"
                                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold"
                                    >
                                        <XCircle class="h-3.5 w-3.5" />
                                        <span>Tolak</span>
                                    </button>
                                </td>
                            </tr>

                            <tr v-if="filteredOrders.length === 0">
                                <td colspan="6" class="px-6 py-12 text-center text-xs text-slate-400">
                                    Tidak ada data pesanan pada filter ini.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
