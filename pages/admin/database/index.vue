<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useSwal } from '~/composables/useSwal';
import {
    Database,
    Download,
    Upload,
    Table as TableIcon,
    Layers,
    Server,
    ShieldCheck,
    Search,
    Calendar,
    FileCode,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user, isAdmin } = useAuthProfile();
const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const searchQuery = ref('');
const isImportModalOpen = ref(false);
const sqlFileContent = ref('');
const sqlFileName = ref('');
const isImporting = ref(false);
const importResults = ref<any>(null);

const knownTables = [
    { name: 'profiles', label: 'Pengguna & Akun' },
    { name: 'courses', label: 'Data Kursus' },
    { name: 'categories', label: 'Kategori Kursus' },
    { name: 'course_sections', label: 'Bab / Silabus' },
    { name: 'lessons', label: 'Pelajaran Video' },
    { name: 'quizzes', label: 'Kuis Evaluasi' },
    { name: 'quiz_questions', label: 'Soal Kuis' },
    { name: 'quiz_options', label: 'Pilihan Jawaban' },
    { name: 'orders', label: 'Pesanan & Transaksi' },
    { name: 'order_items', label: 'Item Pesanan' },
    { name: 'enrollments', label: 'Pendaftaran Siswa' },
    { name: 'lesson_progress', label: 'Progres Belajar' },
    { name: 'quiz_attempts', label: 'Ujian Kuis Siswa' },
    { name: 'certificates', label: 'Sertifikat Kelulusan' },
    { name: 'vouchers', label: 'Kode Voucher Diskon' },
    { name: 'landing_pages', label: 'Landing Page' },
    { name: 'settings', label: 'Pengaturan Sistem' },
    { name: 'audit_logs', label: 'Audit Trail Log' },
];

const tableStats = ref<any[]>([]);

const loadDatabaseStats = async () => {
    loading.value = true;
    try {
        const res: any = await $fetch('/api/admin/database-stats');
        if (res?.tables) {
            tableStats.value = res.tables;
        } else {
            const statsList = [];
            for (const tbl of knownTables) {
                const { count } = await supabase
                    .from(tbl.name)
                    .select('*', { count: 'exact', head: true });
                statsList.push({
                    name: tbl.name,
                    label: tbl.label,
                    rows: count || 0,
                });
            }
            tableStats.value = statsList;
        }
    } catch (err) {
        console.error('Failed to load database stats:', err);
    } finally {
        loading.value = false;
    }
};

const totalRecords = computed(() => {
    return tableStats.value.reduce((acc, t) => acc + (t.rows || 0), 0);
});

const filteredTables = computed(() => {
    if (!searchQuery.value.trim()) return tableStats.value;
    const q = searchQuery.value.toLowerCase().trim();
    return tableStats.value.filter(t => t.name.toLowerCase().includes(q) || t.label.toLowerCase().includes(q));
});

const selectedFile = ref<File | null>(null);

const handleFileUpload = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    selectedFile.value = file;
    sqlFileName.value = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    // Untuk file berukuran wajar (< 1MB), kita muat ke textarea agar bisa di-preview
    if (file.size < 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => {
            sqlFileContent.value = e.target?.result as string || '';
        };
        reader.readAsText(file);
    } else {
        sqlFileContent.value = `/* File SQL terpilih: ${file.name} - Ukuran: ${(file.size / (1024 * 1024)).toFixed(2)} MB.\nFile akan diunggah dan diproses secara langsung via streaming buffer tanpa membebani memori browser. */`;
    }
};

const executeSqlImport = async () => {
    if (!selectedFile.value && !sqlFileContent.value.trim()) {
        swal.toastError('Pilih file SQL atau masukkan konten SQL terlebih dahulu.');
        return;
    }

    isImporting.value = true;
    importResults.value = null;

    try {
        const formData = new FormData();
        if (selectedFile.value) {
            formData.append('file', selectedFile.value);
        } else {
            formData.append('sql_content', sqlFileContent.value);
        }

        const res = await $fetch('/api/admin/import-sql', {
            method: 'POST',
            body: formData,
        });

        importResults.value = res;
        swal.fireSuccess('Import Berhasil!', 'Data SQL berhasil dimigrasikan ke database Supabase.');
        await loadDatabaseStats();
    } catch (err: any) {
        swal.fireError('Import Gagal', err.data?.statusMessage || err.message || 'Terjadi kesalahan saat mengimpor SQL.');
    } finally {
        isImporting.value = false;
    }
};

const exportTableAsJson = async (tableName: string) => {
    try {
        swal.toastInfo(`Mengekspor tabel ${tableName}...`);
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        swal.toastSuccess(`Tabel ${tableName} berhasil diunduh (.json)`);
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal mengekspor tabel');
    }
};

onMounted(() => {
    loadDatabaseStats();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
                    <Database class="h-6 w-6" />
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            Database Backup & Export
                        </h1>
                        <Badge variant="primary" size="sm" class="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold">
                            ADMINISTRATOR
                        </Badge>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manajemen pencadangan data, ekspor skema, dan fasilitas import file SQL database.
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-2.5">
                <Button
                    type="button"
                    @click="isImportModalOpen = true"
                    variant="secondary"
                    size="md"
                    class="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
                >
                    <Upload class="mr-2 h-4 w-4" />
                    <span>Fasilitas Import SQL</span>
                </Button>

                <Button
                    type="button"
                    @click="loadDatabaseStats"
                    variant="primary"
                    size="md"
                    class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20"
                >
                    <Database class="mr-2 h-4 w-4" />
                    <span>Refresh Statistik</span>
                </Button>
            </div>
        </div>

        <div class="space-y-6 max-w-7xl mx-auto">
            <!-- Superadmin Security Banner -->
            <div class="rounded-3xl border border-purple-200/80 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white p-6 shadow-sm dark:border-purple-900/40 dark:from-purple-950/30 dark:via-slate-900 dark:to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div class="flex items-start gap-4">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
                        <ShieldCheck class="h-5 w-5" />
                    </div>
                    <div class="space-y-1">
                        <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">
                            Akses Istimewa Administrator Database
                        </h4>
                        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                            Fasilitas ini terhubung langsung ke mesin database Supabase PostgreSQL. Anda dapat mengimpor file dump SQL dari MySQL/Laragon secara otomatis, mengekspor tabel ke format JSON, serta memantau integritas skema data platform.
                        </p>
                    </div>
                </div>

                <div class="text-right shrink-0">
                    <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 px-3 py-1.5 rounded-xl">
                        <Calendar class="h-3.5 w-3.5" />
                        <span>Supabase PostgreSQL Active</span>
                    </span>
                </div>
            </div>

            <!-- Database Stats Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tabel</span>
                        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            <TableIcon class="h-4 w-4" />
                        </div>
                    </div>
                    <p class="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                        {{ tableStats.length }}
                    </p>
                    <p class="text-[11px] text-slate-400 mt-1">Tabel aktif dalam skema database</p>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Records</span>
                        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                            <Layers class="h-4 w-4" />
                        </div>
                    </div>
                    <p class="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                        {{ totalRecords }}
                    </p>
                    <p class="text-[11px] text-slate-400 mt-1">Akumulasi seluruh baris data</p>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Mesin Database</span>
                        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                            <Server class="h-4 w-4" />
                        </div>
                    </div>
                    <p class="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                        PostgreSQL
                    </p>
                    <p class="text-[11px] text-slate-400 mt-1">Supabase BaaS v15+</p>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Status Replikasi</span>
                        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                            <CheckCircle2 class="h-4 w-4" />
                        </div>
                    </div>
                    <p class="mt-3 text-2xl font-black text-emerald-600">
                        Online
                    </p>
                    <p class="text-[11px] text-slate-400 mt-1">RLS & Trigger Aktif</p>
                </div>
            </div>

            <!-- Tables Overview Section -->
            <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">
                            Daftar Tabel Database
                        </h3>
                        <p class="text-xs text-slate-500">Pilih tabel untuk melihat jumlah baris atau ekspor data ke JSON.</p>
                    </div>

                    <div class="relative w-full sm:w-64">
                        <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Cari nama tabel..."
                            class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-6 py-3.5">Nama Tabel</th>
                                <th class="px-6 py-3.5">Deskripsi</th>
                                <th class="px-6 py-3.5">Jumlah Baris</th>
                                <th class="px-6 py-3.5 text-right">Aksi Ekspor</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="tbl in filteredTables" :key="tbl.name" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td class="px-6 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ tbl.name }}
                                </td>
                                <td class="px-6 py-3.5 text-slate-600 dark:text-slate-300">
                                    {{ tbl.label }}
                                </td>
                                <td class="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                                    {{ tbl.rows }} Baris
                                </td>
                                <td class="px-6 py-3.5 text-right">
                                    <button
                                        type="button"
                                        @click="exportTableAsJson(tbl.name)"
                                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                        <Download class="h-3 w-3" />
                                        <span>Export JSON</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL: IMPORT SQL -->
        <Modal :show="isImportModalOpen" max-width="2xl" title="Fasilitas Import Database SQL" @close="isImportModalOpen = false">
            <div class="space-y-4">
                <div class="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-800 flex items-start gap-3 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
                    <AlertTriangle class="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <p class="font-bold">Perhatian Saat Impor Database SQL:</p>
                        <p class="mt-0.5 leading-relaxed">
                            Parser otomatis kami akan memetakan tabel MySQL (categories, courses, sections, lessons, quizzes, questions, options, orders, vouchers, dll) ke tabel PostgreSQL Supabase secara aman dengan foreign key mapping.
                        </p>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Upload File SQL (.sql)
                    </label>
                    <div class="flex items-center gap-3">
                        <label class="cursor-pointer px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-2 transition">
                            <Upload class="h-4 w-4" />
                            <span>Pilih File .SQL</span>
                            <input type="file" accept=".sql,.txt" @change="handleFileUpload" class="hidden" />
                        </label>
                        <span v-if="sqlFileName" class="text-xs font-mono text-slate-600 dark:text-slate-400">
                            {{ sqlFileName }} ({{ (sqlFileContent.length / 1024).toFixed(1) }} KB)
                        </span>
                    </div>
                </div>

                <div class="space-y-1.5">
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Atau Tempelkan Teks Perintah SQL di Sini:
                    </label>
                    <textarea
                        v-model="sqlFileContent"
                        rows="8"
                        placeholder="INSERT INTO categories ...; INSERT INTO courses ...;"
                        class="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:border-purple-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    ></textarea>
                </div>

                <!-- Results display -->
                <div v-if="importResults" class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-xs space-y-2">
                    <p class="font-bold text-emerald-800 dark:text-emerald-300">Ringkasan Migrasi Data Berhasil:</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-emerald-900 dark:text-emerald-200">
                        <div v-for="(val, key) in importResults.summary" :key="key">
                            • {{ key }}: <strong>{{ val }} data</strong>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button variant="secondary" size="sm" @click="isImportModalOpen = false">Tutup</Button>
                <Button variant="primary" size="sm" :loading="isImporting" @click="executeSqlImport" class="bg-purple-600 hover:bg-purple-700">
                    Eksekusi Import ke Supabase
                </Button>
            </template>
        </Modal>
    </div>
</template>
