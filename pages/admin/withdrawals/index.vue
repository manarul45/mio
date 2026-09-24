<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import Input from '~/components/UI/Input.vue';
import Textarea from '~/components/UI/Textarea.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useToast } from '~/composables/useToast';
import { useSwal } from '~/composables/useSwal';
import {
    Banknote,
    CheckCircle2,
    XCircle,
    Clock,
    Phone,
    ExternalLink,
    Filter,
    MessageCircle,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const toast = useToast();
const swal = useSwal();

const loading = ref(true);
const withdrawals = ref<any[]>([]);
const currentStatus = ref('pending');
const pendingCount = ref(0);

// Approval modal state
const isApproveModalOpen = ref(false);
const selectedWithdrawal = ref<any>(null);
const approveNotes = ref('Pencairan dana telah ditransfer dengan sukses oleh bendahara platform.');
const receiptUrl = ref('');
const isSubmittingApprove = ref(false);

// Rejection modal state
const isRejectModalOpen = ref(false);
const rejectNotes = ref('');
const isSubmittingReject = ref(false);

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

const loadWithdrawals = async () => {
    loading.value = true;
    try {
        const res: any = await $fetch(`/api/admin/withdrawals?status=${currentStatus.value}`);
        withdrawals.value = res.withdrawals || [];
        pendingCount.value = res.pendingCount || 0;
    } catch (err: any) {
        toast.error(err.data?.statusMessage || 'Gagal memuat daftar penarikan komisi.');
    } finally {
        loading.value = false;
    }
};

const openApproveModal = (w: any) => {
    selectedWithdrawal.value = w;
    approveNotes.value = 'Pencairan dana telah ditransfer dengan sukses oleh bendahara platform.';
    receiptUrl.value = '';
    isApproveModalOpen.value = true;
};

const submitApprove = async () => {
    if (!selectedWithdrawal.value) return;
    isSubmittingApprove.value = true;
    try {
        await $fetch(`/api/admin/withdrawals/${selectedWithdrawal.value.id}/approve`, {
            method: 'POST',
            body: {
                admin_notes: approveNotes.value,
                receipt_url: receiptUrl.value.trim() || null,
            },
        });
        swal.toastSuccess(`Penarikan dana #${selectedWithdrawal.value.id} berhasil disetujui!`);
        isApproveModalOpen.value = false;
        loadWithdrawals();
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message || 'Gagal menyetujui penarikan');
    } finally {
        isSubmittingApprove.value = false;
    }
};

const openRejectModal = (w: any) => {
    selectedWithdrawal.value = w;
    rejectNotes.value = '';
    isRejectModalOpen.value = true;
};

const submitReject = async () => {
    if (!selectedWithdrawal.value) return;
    isSubmittingReject.value = true;
    try {
        await $fetch(`/api/admin/withdrawals/${selectedWithdrawal.value.id}/reject`, {
            method: 'POST',
            body: {
                admin_notes: rejectNotes.value.trim() || 'Permintaan penarikan ditolak oleh administrator.',
            },
        });
        swal.toastSuccess(`Permintaan penarikan #${selectedWithdrawal.value.id} telah ditolak.`);
        isRejectModalOpen.value = false;
        loadWithdrawals();
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message || 'Gagal menolak penarikan');
    } finally {
        isSubmittingReject.value = false;
    }
};

const openWhatsApp = (phone: string, w: any) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const msg = encodeURIComponent(`Halo ${w.user?.name || ''}, terkait penarikan komisi afiliasi sebesar ${formatRupiah(w.amount)} ke rekening ${w.bank_name} ${w.account_number}.`);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
};

onMounted(() => {
    loadWithdrawals();
});
</script>

<template>
    <div class="space-y-6 pb-12">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
                <div class="flex items-center gap-2">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                        <Banknote class="h-5 w-5" />
                    </div>
                    <h1 class="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
                        Pencairan Komisi Afiliasi
                    </h1>
                </div>
                <p class="mt-1 text-xs text-slate-500">
                    Verifikasi dan proses pembayaran pencairan komisi mitra afiliasi ke rekening bank.
                </p>
            </div>

            <!-- Status Filter Tabs -->
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl dark:bg-slate-800 text-xs">
                <button
                    type="button"
                    @click="currentStatus = 'pending'; loadWithdrawals()"
                    :class="[
                        'px-3 py-1.5 rounded-xl font-semibold transition',
                        currentStatus === 'pending'
                            ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                    ]"
                >
                    <span>Menunggu</span>
                    <span v-if="pendingCount > 0" class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                        {{ pendingCount }}
                    </span>
                </button>
                <button
                    type="button"
                    @click="currentStatus = 'approved'; loadWithdrawals()"
                    :class="[
                        'px-3 py-1.5 rounded-xl font-semibold transition',
                        currentStatus === 'approved'
                            ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                    ]"
                >
                    Disetujui
                </button>
                <button
                    type="button"
                    @click="currentStatus = 'rejected'; loadWithdrawals()"
                    :class="[
                        'px-3 py-1.5 rounded-xl font-semibold transition',
                        currentStatus === 'rejected'
                            ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                    ]"
                >
                    Ditolak
                </button>
                <button
                    type="button"
                    @click="currentStatus = 'all'; loadWithdrawals()"
                    :class="[
                        'px-3 py-1.5 rounded-xl font-semibold transition',
                        currentStatus === 'all'
                            ? 'bg-white shadow text-slate-900 dark:bg-slate-900 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                    ]"
                >
                    Semua
                </button>
            </div>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat daftar permintaan penarikan komisi..." />
        </div>

        <div v-else-if="withdrawals.length === 0" class="p-12 text-center rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-xs text-slate-400">
            Tidak ada permintaan penarikan dana dengan status ini.
        </div>

        <div v-else class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th class="px-6 py-3.5">Mitra Afiliasi</th>
                            <th class="px-6 py-3.5">Jumlah Penarikan</th>
                            <th class="px-6 py-3.5">Rekening Bank Tujuan</th>
                            <th class="px-6 py-3.5">Status</th>
                            <th class="px-6 py-3.5">Tanggal</th>
                            <th class="px-6 py-3.5 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr v-for="w in withdrawals" :key="w.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td class="px-6 py-4">
                                <p class="font-bold text-slate-900 dark:text-white">{{ w.user?.name || 'User' }}</p>
                                <p class="text-[11px] text-slate-400">{{ w.user?.email }}</p>
                                <button
                                    v-if="w.user?.whatsapp_number"
                                    type="button"
                                    @click="openWhatsApp(w.user.whatsapp_number, w)"
                                    class="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5 hover:underline"
                                >
                                    <MessageCircle class="h-3 w-3" />
                                    <span>{{ w.user.whatsapp_number }}</span>
                                </button>
                            </td>
                            <td class="px-6 py-4 font-black text-slate-900 dark:text-white text-sm">
                                {{ formatRupiah(w.amount) }}
                            </td>
                            <td class="px-6 py-4 space-y-0.5">
                                <p class="font-bold text-slate-800 dark:text-slate-200">{{ w.bank_name }} - {{ w.account_number }}</p>
                                <p class="text-[11px] text-slate-500">a.n. {{ w.account_holder }}</p>
                            </td>
                            <td class="px-6 py-4">
                                <Badge
                                    :variant="w.status === 'approved' ? 'success' : (w.status === 'pending' ? 'warning' : 'danger')"
                                    size="sm"
                                >
                                    {{ w.status === 'approved' ? 'Ditransfer' : (w.status === 'pending' ? 'Menunggu' : 'Ditolak') }}
                                </Badge>
                                <span v-if="w.admin_notes" class="block text-[10px] text-slate-400 mt-1 max-w-xs truncate" :title="w.admin_notes">
                                    {{ w.admin_notes }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-slate-400">
                                {{ formatDate(w.created_at) }}
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div v-if="w.status === 'pending'" class="flex items-center justify-end gap-2">
                                    <Button variant="primary" size="sm" @click="openApproveModal(w)">
                                        <CheckCircle2 class="mr-1 h-3.5 w-3.5" />
                                        <span>Setujui</span>
                                    </Button>
                                    <Button variant="danger" size="sm" @click="openRejectModal(w)">
                                        <XCircle class="mr-1 h-3.5 w-3.5" />
                                        <span>Tolak</span>
                                    </Button>
                                </div>
                                <span v-else class="text-xs text-slate-400 italic">Selesai diproses</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- MODAL: APPROVE WITHDRAWAL -->
        <Modal :show="isApproveModalOpen" title="Konfirmasi Persetujuan Pencairan Komisi" @close="isApproveModalOpen = false">
            <div v-if="selectedWithdrawal" class="space-y-4">
                <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 space-y-1">
                    <p class="text-xs text-emerald-800 dark:text-emerald-300">
                        Transfer Sejumlah: <strong class="text-sm font-black">{{ formatRupiah(selectedWithdrawal.amount) }}</strong>
                    </p>
                    <p class="text-xs text-emerald-700 dark:text-emerald-400">
                        Tujuan: <strong>{{ selectedWithdrawal.bank_name }} {{ selectedWithdrawal.account_number }}</strong> a.n. {{ selectedWithdrawal.account_holder }}
                    </p>
                </div>

                <Input
                    v-model="receiptUrl"
                    label="URL Bukti Transfer (Opsional)"
                    placeholder="https://... atau simpan bukti transfer"
                />

                <Textarea
                    v-model="approveNotes"
                    label="Catatan Admin untuk Siswa"
                    rows="3"
                />
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isApproveModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" :disabled="isSubmittingApprove" @click="submitApprove">
                    {{ isSubmittingApprove ? 'Memproses...' : 'Konfirmasi Transfer & Setujui' }}
                </Button>
            </template>
        </Modal>

        <!-- MODAL: REJECT WITHDRAWAL -->
        <Modal :show="isRejectModalOpen" title="Tolak Permintaan Pencairan Dana" @close="isRejectModalOpen = false">
            <div v-if="selectedWithdrawal" class="space-y-4">
                <p class="text-xs text-slate-600 dark:text-slate-400">
                    Permintaan penarikan sebesar <strong>{{ formatRupiah(selectedWithdrawal.amount) }}</strong> atas nama <strong>{{ selectedWithdrawal.user?.name }}</strong> akan ditolak. Saldo komisi akan dikembalikan ke saldo pengguna.
                </p>

                <Textarea
                    v-model="rejectNotes"
                    label="Alasan Penolakan *"
                    placeholder="Contoh: Nomor rekening tidak cocok dengan nama akun bank..."
                    rows="3"
                    required
                />
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isRejectModalOpen = false">Batal</Button>
                <Button variant="danger" size="sm" :disabled="isSubmittingReject" @click="submitReject">
                    {{ isSubmittingReject ? 'Memproses...' : 'Tolak Penarikan' }}
                </Button>
            </template>
        </Modal>
    </div>
</template>
