<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import Pagination from '~/components/UI/Pagination.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useToast } from '~/composables/useToast';
import {
    ShieldCheck,
    Search,
    Clock,
    FileText,
    Eye,
    Globe,
    User,
    RefreshCw,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const toast = useToast();

const loading = ref(true);
const logs = ref<any[]>([]);
const totalLogs = ref(0);
const search = ref('');
const currentPage = ref(1);
const limit = ref(25);

// Modal state
const isDetailModalOpen = ref(false);
const selectedLog = ref<any>(null);

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const getActionVariant = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('created') || act.includes('store') || act.includes('approved')) return 'success';
    if (act.includes('deleted') || act.includes('destroy') || act.includes('rejected')) return 'danger';
    if (act.includes('updated') || act.includes('edit')) return 'warning';
    return 'purple';
};

const loadAuditLogs = async () => {
    loading.value = true;
    try {
        const res: any = await $fetch(`/api/admin/audit-logs?search=${encodeURIComponent(search.value)}&page=${currentPage.value}&limit=${limit.value}`);
        logs.value = res.logs || [];
        totalLogs.value = res.total || 0;
    } catch (err: any) {
        toast.error(err.data?.statusMessage || 'Gagal memuat log audit.');
    } finally {
        loading.value = false;
    }
};

const openDetail = (log: any) => {
    selectedLog.value = log;
    isDetailModalOpen.value = true;
};

// Debounce search
let searchTimer: any = null;
watch(search, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        currentPage.value = 1;
        loadAuditLogs();
    }, 400);
});

watch(currentPage, () => {
    loadAuditLogs();
});

onMounted(() => {
    loadAuditLogs();
});
</script>

<template>
    <div class="space-y-6 pb-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
                <div class="flex items-center gap-2">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                        <ShieldCheck class="h-5 w-5" />
                    </div>
                    <h1 class="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
                        Audit Trail & Aktivitas Sistem
                    </h1>
                </div>
                <p class="mt-1 text-xs text-slate-500">
                    Rekaman jejak seluruh aktivitas administratif, perubahan data kursus, moderasi, dan transaksi.
                </p>
            </div>

            <!-- Search input -->
            <div class="flex items-center gap-3 w-full sm:w-auto">
                <div class="relative w-full sm:w-72">
                    <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        v-model="search"
                        type="text"
                        placeholder="Cari aksi atau entitas..."
                        class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                </div>
                <Button variant="secondary" size="md" @click="loadAuditLogs" title="Segarkan Log">
                    <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
                </Button>
            </div>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat riwayat audit logs..." />
        </div>

        <div v-else-if="logs.length === 0" class="p-12 text-center rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-xs text-slate-400">
            Tidak ditemukan catatan audit log yang sesuai dengan pencarian Anda.
        </div>

        <div v-else class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th class="px-6 py-3.5">Waktu</th>
                            <th class="px-6 py-3.5">Aktor / Pengguna</th>
                            <th class="px-6 py-3.5">Aksi Sistem</th>
                            <th class="px-6 py-3.5">Entitas & Target ID</th>
                            <th class="px-6 py-3.5">IP Address</th>
                            <th class="px-6 py-3.5 text-right">Detail</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr v-for="l in logs" :key="l.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td class="px-6 py-4 text-slate-400 whitespace-nowrap">
                                {{ formatDate(l.created_at) }}
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <div class="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs dark:bg-indigo-950 dark:text-indigo-300">
                                        {{ l.user?.name ? l.user.name[0].toUpperCase() : 'S' }}
                                    </div>
                                    <div>
                                        <p class="font-bold text-slate-900 dark:text-white">{{ l.user?.name || 'Sistem / Anonim' }}</p>
                                        <p class="text-[10px] text-slate-400">{{ l.user?.email || '-' }}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <Badge :variant="getActionVariant(l.action)" size="sm">
                                    {{ l.action }}
                                </Badge>
                            </td>
                            <td class="px-6 py-4">
                                <p class="font-semibold text-slate-800 dark:text-slate-200">{{ l.entity_type }}</p>
                                <p class="text-[10px] text-slate-400 font-mono">ID: #{{ l.entity_id }}</p>
                            </td>
                            <td class="px-6 py-4 text-slate-400 font-mono text-[11px]">
                                {{ l.ip_address || '127.0.0.1' }}
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button
                                    type="button"
                                    @click="openDetail(l)"
                                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <Eye class="h-3 w-3" />
                                    <span>Diff</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span class="text-xs text-slate-400">Total {{ totalLogs }} catatan aktivitas</span>
                <Pagination
                    v-if="totalLogs > limit"
                    :current-page="currentPage"
                    :total-items="totalLogs"
                    :per-page="limit"
                    @page-changed="(p) => currentPage = p"
                />
            </div>
        </div>

        <!-- MODAL: DETAIL DIFF PERUBAHAN -->
        <Modal :show="isDetailModalOpen" title="Rincian Log Perubahan Sistem" @close="isDetailModalOpen = false">
            <div v-if="selectedLog" class="space-y-4 text-xs">
                <div class="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div>
                        <span class="text-slate-400 block text-[10px]">Aksi:</span>
                        <strong class="text-indigo-600 dark:text-indigo-400">{{ selectedLog.action }}</strong>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px]">Entitas:</span>
                        <strong>{{ selectedLog.entity_type }} (#{{ selectedLog.entity_id }})</strong>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px]">Pengguna:</span>
                        <strong>{{ selectedLog.user?.name || '-' }} ({{ selectedLog.user?.email || '-' }})</strong>
                    </div>
                    <div>
                        <span class="text-slate-400 block text-[10px]">IP & User Agent:</span>
                        <span class="truncate block font-mono text-[10px] text-slate-500">{{ selectedLog.ip_address }} — {{ selectedLog.user_agent || '-' }}</span>
                    </div>
                </div>

                <!-- Old Values vs New Values -->
                <div class="space-y-3">
                    <div>
                        <span class="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nilai Sebelum (Old Values):</span>
                        <pre class="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48">{{ selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : '(Tidak ada data lama)' }}</pre>
                    </div>

                    <div>
                        <span class="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nilai Sesudah (New Values):</span>
                        <pre class="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-48">{{ selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : '(Tidak ada data baru)' }}</pre>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isDetailModalOpen = false">Tutup</Button>
            </template>
        </Modal>
    </div>
</template>
