<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import Input from '~/components/UI/Input.vue';
import Select from '~/components/UI/Select.vue';
import { useSwal } from '~/composables/useSwal';
import type { Voucher } from '~/types/database.types';
import {
    Plus,
    Ticket,
    Edit3,
    Trash2,
    Copy,
    Check,
    Search,
    Tag,
    AlertCircle,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
    middleware: ['admin'],
});

const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const vouchers = ref<Voucher[]>([]);
const search = ref('');
const isModalOpen = ref(false);
const editingVoucher = ref<Voucher | null>(null);
const copiedCode = ref<string | null>(null);
const isSubmitting = ref(false);

const form = ref({
    code: '',
    name: '',
    type: 'fixed',
    discount_amount: '' as any,
    min_order_amount: 0,
    max_discount_amount: '' as any,
    usage_limit: '' as any,
    expires_at: '',
    is_active: true,
});

const formErrors = ref<Record<string, string>>({});

const loadVouchers = async () => {
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('vouchers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        vouchers.value = (data as Voucher[]) || [];
    } catch (err: any) {
        console.error('Failed to load vouchers:', err);
        swal.toastError(err.message || 'Gagal memuat daftar voucher');
    } finally {
        loading.value = false;
    }
};

const filteredVouchers = computed(() => {
    if (!search.value.trim()) return vouchers.value;
    const q = search.value.toLowerCase().trim();
    return vouchers.value.filter(v =>
        v.code.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q)
    );
});

const openCreateModal = () => {
    editingVoucher.value = null;
    form.value = {
        code: '',
        name: '',
        type: 'fixed',
        discount_amount: '',
        min_order_amount: 0,
        max_discount_amount: '',
        usage_limit: '',
        expires_at: '',
        is_active: true,
    };
    formErrors.value = {};
    isModalOpen.value = true;
};

const openEditModal = (voucher: Voucher) => {
    editingVoucher.value = voucher;
    formErrors.value = {};
    form.value = {
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        discount_amount: voucher.discount_amount,
        min_order_amount: voucher.min_order_amount || 0,
        max_discount_amount: voucher.max_discount_amount || '',
        usage_limit: voucher.usage_limit || '',
        expires_at: voucher.expires_at ? new Date(voucher.expires_at).toISOString().slice(0, 16) : '',
        is_active: !!voucher.is_active,
    };
    isModalOpen.value = true;
};

const submitForm = async () => {
    formErrors.value = {};

    if (!form.value.code.trim()) {
        formErrors.value.code = 'Kode voucher wajib diisi';
        return;
    }
    if (!form.value.name.trim()) {
        formErrors.value.name = 'Nama voucher wajib diisi';
        return;
    }
    if (!form.value.discount_amount) {
        formErrors.value.discount_amount = 'Nilai diskon wajib diisi';
        return;
    }

    isSubmitting.value = true;
    try {
        const payload: any = {
            code: form.value.code.toUpperCase().trim(),
            name: form.value.name.trim(),
            type: form.value.type,
            discount_amount: Number(form.value.discount_amount),
            min_order_amount: Number(form.value.min_order_amount) || 0,
            max_discount_amount: form.value.max_discount_amount ? Number(form.value.max_discount_amount) : null,
            usage_limit: form.value.usage_limit ? Number(form.value.usage_limit) : null,
            expires_at: form.value.expires_at ? new Date(form.value.expires_at).toISOString() : null,
            is_active: Boolean(form.value.is_active),
            updated_at: new Date().toISOString(),
        };

        if (editingVoucher.value) {
            const { error } = await supabase
                .from('vouchers')
                .update(payload)
                .eq('id', editingVoucher.value.id);

            if (error) throw error;
            swal.toastSuccess('Voucher berhasil diperbarui');
        } else {
            payload.used_count = 0;
            payload.created_at = new Date().toISOString();
            const { error } = await supabase
                .from('vouchers')
                .insert(payload);

            if (error) throw error;
            swal.toastSuccess('Voucher baru berhasil dibuat');
        }

        isModalOpen.value = false;
        await loadVouchers();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menyimpan voucher');
    } finally {
        isSubmitting.value = false;
    }
};

const toggleVoucher = async (voucher: Voucher) => {
    try {
        const nextStatus = !voucher.is_active;
        const { error } = await supabase
            .from('vouchers')
            .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
            .eq('id', voucher.id);

        if (error) throw error;
        voucher.is_active = nextStatus;
        swal.toastSuccess(`Voucher ${voucher.code} kini ${nextStatus ? 'AKTIF' : 'NONAKTIF'}`);
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal mengubah status voucher');
    }
};

const deleteVoucher = async (voucher: Voucher) => {
    const confirmed = await swal.confirm(
        `Apakah Anda yakin ingin menghapus voucher '${voucher.code}'?`,
        'Tindakan ini tidak dapat dibatalkan.'
    );
    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('vouchers')
            .delete()
            .eq('id', voucher.id);

        if (error) throw error;
        swal.toastSuccess(`Voucher ${voucher.code} berhasil dihapus`);
        await loadVouchers();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menghapus voucher');
    }
};

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    copiedCode.value = text;
    setTimeout(() => {
        copiedCode.value = null;
    }, 2000);
};

const formatRupiah = (val: number | string | null | undefined) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(Number(val));
};

const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Tanpa Batas';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isExpired = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
};

onMounted(() => {
    loadVouchers();
});
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                        <Ticket class="h-5 w-5" />
                    </div>
                    <span>Manajemen Kode Voucher Diskon</span>
                </h1>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Buat dan kelola kupon diskon nominal rupiah atau persentase beserta tanggal kedaluwarsa & batas penggunaan.
                </p>
            </div>

            <div class="flex items-center gap-3">
                <Button type="button" @click="openCreateModal" variant="primary" size="md" class="bg-indigo-600 hover:bg-indigo-700">
                    <Plus class="mr-1.5 h-4 w-4" />
                    <span>Buat Voucher Baru</span>
                </Button>
            </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
            <div class="relative w-full sm:w-80">
                <Search class="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                    v-model="search"
                    type="text"
                    placeholder="Cari kode atau nama voucher..."
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
            </div>

            <div class="text-xs text-slate-500 font-medium">
                Total: <strong class="text-slate-900 dark:text-white">{{ filteredVouchers.length }} Voucher</strong>
            </div>
        </div>

        <!-- Vouchers Table -->
        <div class="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th class="py-3.5 px-4">Kode & Nama Voucher</th>
                            <th class="py-3.5 px-4">Tipe & Nilai Diskon</th>
                            <th class="py-3.5 px-4">Syarat & Batas</th>
                            <th class="py-3.5 px-4">Penggunaan</th>
                            <th class="py-3.5 px-4">Masa Berlaku</th>
                            <th class="py-3.5 px-4">Status</th>
                            <th class="py-3.5 px-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody v-if="filteredVouchers.length > 0" class="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr
                            v-for="item in filteredVouchers"
                            :key="item.id"
                            class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                            <td class="py-4 px-4">
                                <div class="space-y-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900">
                                            {{ item.code }}
                                        </span>
                                        <button
                                            type="button"
                                            @click="copyToClipboard(item.code)"
                                            class="text-slate-400 hover:text-indigo-600 transition"
                                            title="Salin Kode"
                                        >
                                            <Check v-if="copiedCode === item.code" class="h-3.5 w-3.5 text-emerald-500" />
                                            <Copy v-else class="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <p class="font-bold text-slate-900 dark:text-white">{{ item.name }}</p>
                                </div>
                            </td>

                            <td class="py-4 px-4">
                                <div class="space-y-0.5">
                                    <span
                                        :class="[
                                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
                                            item.type === 'percentage'
                                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                        ]"
                                    >
                                        <Tag class="h-3 w-3" />
                                        {{ item.type === 'percentage' ? `${item.discount_amount}% Diskon` : formatRupiah(item.discount_amount) }}
                                    </span>
                                    <p v-if="item.type === 'percentage' && item.max_discount_amount" class="text-[11px] text-slate-500">
                                        Maks: {{ formatRupiah(item.max_discount_amount) }}
                                    </p>
                                </div>
                            </td>

                            <td class="py-4 px-4 text-slate-600 dark:text-slate-300">
                                <p class="font-medium">Min. Pembelian:</p>
                                <p class="font-semibold text-slate-900 dark:text-white">{{ item.min_order_amount > 0 ? formatRupiah(item.min_order_amount) : 'Tanpa Minimal' }}</p>
                            </td>

                            <td class="py-4 px-4">
                                <div class="space-y-0.5">
                                    <span class="font-bold text-slate-900 dark:text-white">
                                        {{ item.used_count }}x dipakai
                                    </span>
                                    <p class="text-[11px] text-slate-500">
                                        Limit: {{ item.usage_limit ? `${item.usage_limit}x` : 'Tanpa Batas' }}
                                    </p>
                                </div>
                            </td>

                            <td class="py-4 px-4">
                                <div class="space-y-0.5">
                                    <span v-if="isExpired(item.expires_at)" class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                        <AlertCircle class="h-3 w-3" />
                                        Expired
                                    </span>
                                    <p :class="['font-medium', isExpired(item.expires_at) ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white']">
                                        {{ formatDate(item.expires_at) }}
                                    </p>
                                </div>
                            </td>

                            <td class="py-4 px-4">
                                <button
                                    type="button"
                                    @click="toggleVoucher(item)"
                                    :class="[
                                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition',
                                        item.is_active
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                    ]"
                                >
                                    <span class="h-2 w-2 rounded-full" :class="item.is_active ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                                    <span>{{ item.is_active ? 'AKTIF' : 'NONAKTIF' }}</span>
                                </button>
                            </td>

                            <td class="py-4 px-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        @click="openEditModal(item)"
                                        class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                                        title="Edit Voucher"
                                    >
                                        <Edit3 class="h-3.5 w-3.5" />
                                    </button>

                                    <button
                                        type="button"
                                        @click="deleteVoucher(item)"
                                        class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-rose-500 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                                        title="Hapus Voucher"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr>
                            <td colspan="7" class="py-12 text-center text-slate-400 text-xs">
                                {{ loading ? 'Memuat data voucher...' : 'Belum ada kode voucher diskon. Klik "Buat Voucher Baru" untuk membuat kode promo pertama Anda.' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- CREATE / EDIT VOUCHER MODAL -->
        <Modal
            :show="isModalOpen"
            max-width="lg"
            :title="editingVoucher ? `Edit Kode Voucher: ${editingVoucher.code}` : '⚡ Buat Kode Voucher Diskon Baru'"
            @close="isModalOpen = false"
        >
            <form id="voucherForm" @submit.prevent="submitForm" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-model="form.code"
                        label="Kode Voucher *"
                        placeholder="Contoh: DISKON50, RAMADHAN2026"
                        :error="formErrors.code"
                        required
                    />

                    <Input
                        v-model="form.name"
                        label="Nama / Label Promo *"
                        placeholder="Contoh: Promo Spesial 50 Ribu"
                        :error="formErrors.name"
                        required
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        v-model="form.type"
                        label="Tipe Diskon *"
                        :options="[
                            { value: 'fixed', label: 'Nominal Rupiah (Rp)' },
                            { value: 'percentage', label: 'Persentase (%)' },
                        ]"
                        required
                    />

                    <Input
                        v-model="form.discount_amount"
                        :label="form.type === 'percentage' ? 'Persentase Diskon (%) *' : 'Nominal Diskon (Rp) *'"
                        type="number"
                        step="any"
                        :placeholder="form.type === 'percentage' ? 'Contoh: 20' : 'Contoh: 50000'"
                        :error="formErrors.discount_amount"
                        required
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-model="form.min_order_amount"
                        label="Minimal Pembelian (Rp)"
                        type="number"
                        placeholder="0 (Tanpa minimal)"
                    />

                    <Input
                        v-if="form.type === 'percentage'"
                        v-model="form.max_discount_amount"
                        label="Maksimal Potongan Diskon (Rp)"
                        type="number"
                        placeholder="Kosongkan jika tanpa batas maks"
                    />

                    <Input
                        v-else
                        v-model="form.usage_limit"
                        label="Batas Jumlah Pemakaian (Limit)"
                        type="number"
                        placeholder="Kosongkan jika tanpa batas"
                    />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-if="form.type === 'percentage'"
                        v-model="form.usage_limit"
                        label="Batas Jumlah Pemakaian (Limit)"
                        type="number"
                        placeholder="Kosongkan jika tanpa batas"
                    />

                    <Input
                        v-model="form.expires_at"
                        label="Tanggal Kedaluwarsa"
                        type="datetime-local"
                    />
                </div>

                <div class="flex items-center gap-3 pt-2">
                    <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            v-model="form.is_active"
                            class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span>Status Voucher Aktif & Bisa Digunakan</span>
                    </label>
                </div>
            </form>

            <template #footer>
                <Button type="button" @click="isModalOpen = false" variant="secondary" size="md">
                    Batal
                </Button>
                <Button type="submit" form="voucherForm" :loading="isSubmitting" variant="primary" size="md" class="bg-indigo-600 hover:bg-indigo-700">
                    <span>{{ editingVoucher ? 'Simpan Perubahan' : 'Buat Voucher Sekarang' }}</span>
                </Button>
            </template>
        </Modal>
    </div>
</template>
