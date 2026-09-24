<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import Input from '~/components/UI/Input.vue';
import Select from '~/components/UI/Select.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useToast } from '~/composables/useToast';
import { useSwal } from '~/composables/useSwal';
import {
    Coins,
    TrendingUp,
    Clock,
    CheckCircle2,
    Copy,
    Check,
    CreditCard,
    ArrowUpRight,
    ExternalLink,
    Banknote,
    Share2,
    BookOpen,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const toast = useToast();
const swal = useSwal();

const loading = ref(true);
const stats = ref<any>({
    total_earnings: 0,
    pending_earnings: 0,
    cleared_earnings: 0,
    total_withdrawn: 0,
    pending_withdrawal: 0,
    withdrawable_balance: 0,
    affiliate_rate: 20,
});
const commissions = ref<any[]>([]);
const withdrawals = ref<any[]>([]);
const courses = ref<any[]>([]);
const userId = ref('');

const activeTab = ref<'commissions' | 'withdrawals' | 'links'>('commissions');
const isWithdrawModalOpen = ref(false);
const isSubmittingWithdraw = ref(false);
const copiedCode = ref<string | null>(null);

const withdrawForm = ref({
    amount: 50000,
    bank_name: 'BCA',
    account_number: '',
    account_holder: '',
});

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

const baseUrl = computed(() => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'https://mioacademy.id';
});

const globalReferralUrl = computed(() => {
    if (!userId.value) return '';
    return `${baseUrl.value}/courses?ref=${userId.value}`;
});

const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    copiedCode.value = key;
    toast.success('Tautan referral berhasil disalin!');
    setTimeout(() => {
        if (copiedCode.value === key) copiedCode.value = null;
    }, 2500);
};

const loadAffiliateData = async () => {
    loading.value = true;
    try {
        const res: any = await $fetch('/api/affiliate/stats');
        stats.value = res.stats;
        commissions.value = res.commissions || [];
        withdrawals.value = res.withdrawals || [];
        courses.value = res.courses || [];
        userId.value = res.user_id || '';
    } catch (err: any) {
        toast.error(err.data?.statusMessage || 'Gagal memuat data afiliasi');
    } finally {
        loading.value = false;
    }
};

const submitWithdrawal = async () => {
    if (withdrawForm.value.amount < 50000) {
        toast.warning('Minimum penarikan adalah Rp 50.000');
        return;
    }
    if (withdrawForm.value.amount > stats.value.withdrawable_balance) {
        toast.warning('Nominal melebihi saldo yang tersedia untuk ditarik.');
        return;
    }
    if (!withdrawForm.value.bank_name || !withdrawForm.value.account_number.trim() || !withdrawForm.value.account_holder.trim()) {
        toast.warning('Lengkapi data rekening bank Anda.');
        return;
    }

    isSubmittingWithdraw.value = true;
    try {
        await $fetch('/api/affiliate/withdraw', {
            method: 'POST',
            body: withdrawForm.value,
        });

        swal.toastSuccess('Permintaan penarikan komisi berhasil dikirimkan!');
        isWithdrawModalOpen.value = false;
        withdrawForm.value = {
            amount: 50000,
            bank_name: 'BCA',
            account_number: '',
            account_holder: '',
        };
        loadAffiliateData();
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message || 'Gagal mengajukan penarikan');
    } finally {
        isSubmittingWithdraw.value = false;
    }
};

onMounted(() => {
    loadAffiliateData();
});
</script>

<template>
    <div class="space-y-8 pb-12">
        <!-- Header Section -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div>
                <div class="flex items-center gap-2">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <Coins class="h-5 w-5" />
                    </div>
                    <h1 class="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl">
                        Program Afiliasi & Komisi
                    </h1>
                </div>
                <p class="mt-1 text-xs sm:text-sm text-slate-500">
                    Bagikan tautan kursus dan dapatkan komisi hingga {{ stats.affiliate_rate }}% untuk setiap pembelian dari referral Anda.
                </p>
            </div>

            <div>
                <Button
                    variant="primary"
                    size="md"
                    :disabled="stats.withdrawable_balance < 50000"
                    @click="isWithdrawModalOpen = true"
                    class="shadow-lg shadow-indigo-600/20"
                >
                    <Banknote class="mr-2 h-4 w-4" />
                    <span>Tarik Saldo Komisi</span>
                </Button>
            </div>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat dashboard afiliasi Anda..." />
        </div>

        <template v-else>
            <!-- 4 Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <!-- Total Earnings -->
                <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Total Komisi Diraih</p>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {{ formatRupiah(stats.total_earnings) }}
                        </p>
                        <p class="text-[11px] text-emerald-500 mt-1 font-medium flex items-center gap-1">
                            <TrendingUp class="h-3 w-3" />
                            <span>{{ stats.affiliate_rate }}% Bagi Hasil</span>
                        </p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <Coins class="h-6 w-6" />
                    </div>
                </div>

                <!-- Withdrawable Balance -->
                <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Saldo Siap Ditarik</p>
                        <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {{ formatRupiah(stats.withdrawable_balance) }}
                        </p>
                        <p class="text-[11px] text-slate-500 mt-1">
                            Min. penarikan Rp 50.000
                        </p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <Banknote class="h-6 w-6" />
                    </div>
                </div>

                <!-- Pending Earnings -->
                <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Komisi Menunggu Approval</p>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {{ formatRupiah(stats.pending_earnings) }}
                        </p>
                        <p class="text-[11px] text-amber-500 mt-1">Menunggu verifikasi order</p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <Clock class="h-6 w-6" />
                    </div>
                </div>

                <!-- Total Withdrawn -->
                <div class="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Total Berhasil Ditarik</p>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {{ formatRupiah(stats.total_withdrawn) }}
                        </p>
                        <p v-if="stats.pending_withdrawal > 0" class="text-[11px] text-rose-500 mt-1">
                            +{{ formatRupiah(stats.pending_withdrawal) }} proses
                        </p>
                        <p v-else class="text-[11px] text-slate-400 mt-1">Cair ke rekening bank</p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                        <CreditCard class="h-6 w-6" />
                    </div>
                </div>
            </div>

            <!-- Global Referral Banner -->
            <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-800 text-white shadow-xl space-y-4">
                <div class="flex items-center gap-3">
                    <Share2 class="h-6 w-6 text-indigo-400" />
                    <h3 class="text-base sm:text-lg font-bold">Tautan Referral Utama Anda</h3>
                </div>
                <p class="text-xs sm:text-sm text-indigo-200 max-w-2xl">
                    Sebarkan link katalog utama berikut. Setiap pengunjung yang mendaftar atau membeli kursus melalui link ini akan otomatis tercatat sebagai transaksi komisi Anda.
                </p>

                <div class="flex flex-col sm:flex-row items-center gap-3 max-w-2xl">
                    <input
                        :value="globalReferralUrl"
                        readonly
                        class="w-full px-4 py-3 rounded-2xl bg-black/40 border border-indigo-700/60 text-xs sm:text-sm text-indigo-100 font-mono focus:outline-none"
                    />
                    <Button
                        type="button"
                        variant="primary"
                        size="md"
                        @click="copyToClipboard(globalReferralUrl, 'global')"
                        class="w-full sm:w-auto shrink-0"
                    >
                        <Check v-if="copiedCode === 'global'" class="mr-1.5 h-4 w-4" />
                        <Copy v-else class="mr-1.5 h-4 w-4" />
                        <span>{{ copiedCode === 'global' ? 'Tersalin!' : 'Salin Tautan' }}</span>
                    </Button>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                    type="button"
                    @click="activeTab = 'commissions'"
                    :class="[
                        'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2',
                        activeTab === 'commissions'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    ]"
                >
                    <Coins class="h-4 w-4" />
                    <span>Riwayat Komisi ({{ commissions.length }})</span>
                </button>
                <button
                    type="button"
                    @click="activeTab = 'withdrawals'"
                    :class="[
                        'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2',
                        activeTab === 'withdrawals'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    ]"
                >
                    <Banknote class="h-4 w-4" />
                    <span>Pencairan Dana ({{ withdrawals.length }})</span>
                </button>
                <button
                    type="button"
                    @click="activeTab = 'links'"
                    :class="[
                        'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2',
                        activeTab === 'links'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    ]"
                >
                    <BookOpen class="h-4 w-4" />
                    <span>Link per Kursus ({{ courses.length }})</span>
                </button>
            </div>

            <!-- TAB 1: COMMISSIONS TABLE -->
            <div v-show="activeTab === 'commissions'" class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div v-if="commissions.length === 0" class="p-12 text-center text-xs text-slate-500">
                    Belum ada riwayat komisi. Bagikan link referral Anda untuk mulai menghasilkan komisi!
                </div>
                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-6 py-3.5">Kursus Terjual</th>
                                <th class="px-6 py-3.5">No. Pesanan</th>
                                <th class="px-6 py-3.5">Pembeli</th>
                                <th class="px-6 py-3.5">Komisi Anda</th>
                                <th class="px-6 py-3.5">Status</th>
                                <th class="px-6 py-3.5">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="c in commissions" :key="c.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td class="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                    {{ c.course?.title || 'Kursus MIO' }}
                                </td>
                                <td class="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                    #{{ c.order?.order_number || '-' }}
                                </td>
                                <td class="px-6 py-4 text-slate-600 dark:text-slate-300">
                                    {{ c.order?.profiles?.name || 'Siswa' }}
                                </td>
                                <td class="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400">
                                    {{ formatRupiah(c.amount) }}
                                </td>
                                <td class="px-6 py-4">
                                    <Badge
                                        :variant="c.status === 'approved' || c.status === 'paid' ? 'success' : (c.status === 'pending' ? 'warning' : 'gray')"
                                        size="sm"
                                    >
                                        {{ c.status === 'paid' ? 'Lunas Ditarik' : (c.status === 'approved' ? 'Tersedia' : 'Pending') }}
                                    </Badge>
                                </td>
                                <td class="px-6 py-4 text-slate-400">
                                    {{ formatDate(c.created_at) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TAB 2: WITHDRAWALS TABLE -->
            <div v-show="activeTab === 'withdrawals'" class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div v-if="withdrawals.length === 0" class="p-12 text-center text-xs text-slate-500">
                    Belum ada riwayat penarikan dana komisi.
                </div>
                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-6 py-3.5">Tanggal</th>
                                <th class="px-6 py-3.5">Jumlah Penarikan</th>
                                <th class="px-6 py-3.5">Rekening Bank Tujuan</th>
                                <th class="px-6 py-3.5">Status</th>
                                <th class="px-6 py-3.5">Catatan / Bukti</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="w in withdrawals" :key="w.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td class="px-6 py-4 text-slate-400">
                                    {{ formatDate(w.created_at) }}
                                </td>
                                <td class="px-6 py-4 font-black text-slate-900 dark:text-white">
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
                                        {{ w.status === 'approved' ? 'Ditransfer' : (w.status === 'pending' ? 'Diproses' : 'Ditolak') }}
                                    </Badge>
                                </td>
                                <td class="px-6 py-4 text-slate-500">
                                    <span v-if="w.admin_notes" class="block text-xs italic">{{ w.admin_notes }}</span>
                                    <a
                                        v-if="w.receipt_url"
                                        :href="w.receipt_url"
                                        target="_blank"
                                        class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline mt-1"
                                    >
                                        <ExternalLink class="h-3 w-3" />
                                        <span>Lihat Bukti Transfer</span>
                                    </a>
                                    <span v-if="!w.admin_notes && !w.receipt_url">-</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TAB 3: COURSE LINKS -->
            <div v-show="activeTab === 'links'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    v-for="crs in courses"
                    :key="crs.id"
                    class="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between space-y-4"
                >
                    <div class="space-y-3">
                        <div class="aspect-video w-full rounded-2xl bg-slate-100 overflow-hidden dark:bg-slate-800">
                            <img
                                :src="crs.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'"
                                :alt="crs.title"
                                class="h-full w-full object-cover"
                            />
                        </div>
                        <h4 class="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                            {{ crs.title }}
                        </h4>
                        <p class="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                            {{ formatRupiah(crs.discount_price || crs.price) }}
                        </p>
                    </div>

                    <div class="pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            class="w-full"
                            @click="copyToClipboard(`${baseUrl}/courses/${crs.slug}?ref=${userId}`, `course-${crs.id}`)"
                        >
                            <Check v-if="copiedCode === `course-${crs.id}`" class="mr-1.5 h-3.5 w-3.5" />
                            <Copy v-else class="mr-1.5 h-3.5 w-3.5" />
                            <span>{{ copiedCode === `course-${crs.id}` ? 'Tautan Tersalin!' : 'Salin Link Kursus Ini' }}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </template>

        <!-- MODAL: WITHDRAWAL REQUEST -->
        <Modal :show="isWithdrawModalOpen" title="Tarik Saldo Komisi Afiliasi" @close="isWithdrawModalOpen = false">
            <form @submit.prevent="submitWithdrawal" class="space-y-4">
                <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900">
                    <p class="text-xs text-emerald-800 dark:text-emerald-300">
                        Saldo Komisi Tersedia: <strong>{{ formatRupiah(stats.withdrawable_balance) }}</strong>
                    </p>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nominal Penarikan (Rp) *
                    </label>
                    <input
                        v-model.number="withdrawForm.amount"
                        type="number"
                        min="50000"
                        :max="stats.withdrawable_balance"
                        step="10000"
                        required
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <p class="text-[11px] text-slate-400 mt-1">Minimal penarikan Rp 50.000</p>
                </div>

                <Select
                    v-model="withdrawForm.bank_name"
                    label="Nama Bank / E-Wallet *"
                    required
                >
                    <option value="BCA">Bank Central Asia (BCA)</option>
                    <option value="Mandiri">Bank Mandiri</option>
                    <option value="BRI">Bank Rakyat Indonesia (BRI)</option>
                    <option value="BNI">Bank Negara Indonesia (BNI)</option>
                    <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                    <option value="CIMB">CIMB Niaga</option>
                    <option value="Jago">Bank Jago</option>
                    <option value="SeaBank">SeaBank</option>
                    <option value="GoPay">GoPay</option>
                    <option value="OVO">OVO</option>
                    <option value="DANA">DANA</option>
                </Select>

                <Input
                    v-model="withdrawForm.account_number"
                    label="Nomor Rekening / No. HP E-Wallet *"
                    placeholder="Contoh: 1234567890"
                    required
                />

                <Input
                    v-model="withdrawForm.account_holder"
                    label="Nama Pemilik Rekening *"
                    placeholder="Sesuai buku tabungan / akun e-wallet"
                    required
                />

                <div class="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="secondary" size="sm" type="button" @click="isWithdrawModalOpen = false">Batal</Button>
                    <Button variant="primary" size="sm" type="submit" :disabled="isSubmittingWithdraw">
                        {{ isSubmittingWithdraw ? 'Mengirim...' : 'Kirim Permintaan' }}
                    </Button>
                </div>
            </form>
        </Modal>
    </div>
</template>
