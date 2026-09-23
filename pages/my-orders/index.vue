<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Badge from '~/components/UI/Badge.vue';
import EmptyState from '~/components/UI/EmptyState.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import {
    Calendar,
    ArrowRight,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user } = useAuthProfile();
const supabase = useSupabaseClient();

const loading = ref(true);
const orders = ref<any[]>([]);

const formatRupiah = (val: number) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(val);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const loadOrders = async () => {
    if (!user.value) return;
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
                created_at,
                order_items(
                    id,
                    courses:course_id(title)
                )
            `)
            .eq('user_id', user.value.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        orders.value = (data || []).map((o: any) => ({
            id: o.id,
            order_number: o.order_number,
            total_amount: o.total_amount,
            final_amount: o.final_amount,
            status: o.status,
            created_at: o.created_at,
            items: (o.order_items || []).map((item: any) => ({
                id: item.id,
                course: item.courses,
            })),
        }));
    } catch (err) {
        console.error('Failed to load orders:', err);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadOrders();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <h1 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Riwayat Transaksi
            </h1>
            <p class="text-xs text-slate-500 hidden sm:block">Daftar pesanan kursus dan status pembayaran Anda.</p>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat riwayat transaksi Anda..." />
        </div>

        <div v-else class="space-y-6">
            <div v-if="orders.length > 0" class="space-y-4">
                <div
                    v-for="order in orders"
                    :key="order.id"
                    class="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6"
                >
                    <div class="space-y-2 min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono text-xs font-bold text-indigo-600">#{{ order.order_number }}</span>
                            <Badge :variant="order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'" size="sm">
                                {{ order.status === 'paid' ? 'LUNAS' : order.status === 'pending' ? 'PENDING' : order.status.toUpperCase() }}
                            </Badge>
                        </div>

                        <div class="space-y-0.5">
                            <div v-for="item in order.items" :key="item.id" class="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                                {{ item.course?.title }}
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar class="h-3 w-3 shrink-0" />
                            <span>{{ formatDate(order.created_at) }}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                        <div class="text-left sm:text-right">
                            <span class="text-[11px] text-slate-400 block">Total Bayar:</span>
                            <p class="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                                {{ formatRupiah(order.final_amount || order.total_amount) }}
                            </p>
                        </div>

                        <NuxtLink
                            :to="`/orders/${order.order_number}`"
                            class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 sm:bg-indigo-50 px-4 py-2.5 sm:py-2 text-xs font-bold text-white sm:text-indigo-700 hover:bg-indigo-700 sm:hover:bg-indigo-100 transition shadow-sm sm:shadow-none shrink-0"
                        >
                            <span>Lihat Invoice</span>
                            <ArrowRight class="h-3.5 w-3.5" />
                        </NuxtLink>
                    </div>
                </div>
            </div>

            <EmptyState
                v-else
                title="Belum Ada Transaksi"
                description="Anda belum melakukan pembelian kursus apa pun."
                action-text="Jelajahi Katalog Kursus"
                action-href="/courses"
            />
        </div>
    </div>
</template>
