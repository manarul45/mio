<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Input from '~/components/UI/Input.vue';
import Select from '~/components/UI/Select.vue';
import Modal from '~/components/UI/Modal.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useSwal } from '~/composables/useSwal';
import {
    Users,
    UserPlus,
    Search,
    Shield,
    GraduationCap,
    BookOpen,
    Edit3,
    UploadCloud,
    Key,
    Trash2,
    MessageCircle,
    Copy,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const usersList = ref<any[]>([]);
const search = ref('');
const activeRole = ref('all');

// Modals State
const isAddManualOpen = ref(false);
const isEditModalOpen = ref(false);
const isBulkModalOpen = ref(false);
const selectedUser = ref<any>(null);

const emptySingleForm = () => ({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    whatsapp_number: '',
    course_ids: [] as number[],
});
const singleForm = ref(emptySingleForm());
const isSubmittingSingle = ref(false);

const courseOptions = ref<any[]>([]);
const courseSearch = ref('');
const isEnrollModalOpen = ref(false);
const enrollUser = ref<any>(null);
const enrollCourseIds = ref<number[]>([]);
const enrollProgress = ref<Record<number, number>>({});
const loadingEnrollments = ref(false);
const isSavingEnrollments = ref(false);

const filteredCourseOptions = computed(() => {
    const q = courseSearch.value.toLowerCase().trim();
    return q ? courseOptions.value.filter(c => c.title?.toLowerCase().includes(q)) : courseOptions.value;
});

const loadCourseOptions = async () => {
    if (courseOptions.value.length) return;
    try {
        const res: any = await $fetch('/api/admin/course-options');
        courseOptions.value = res.courses || [];
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || 'Gagal memuat daftar kursus');
    }
};

const openAddManual = () => {
    singleForm.value = emptySingleForm();
    courseSearch.value = '';
    isAddManualOpen.value = true;
    loadCourseOptions();
};

const openEnrollModal = async (u: any) => {
    enrollUser.value = u;
    enrollCourseIds.value = [];
    enrollProgress.value = {};
    courseSearch.value = '';
    isEnrollModalOpen.value = true;
    loadingEnrollments.value = true;
    try {
        const [, res]: any = await Promise.all([
            loadCourseOptions(),
            $fetch(`/api/admin/users/${u.id}/enrollments`),
        ]);
        const active = (res.enrollments || []).filter((e: any) => e.status === 'active');
        enrollCourseIds.value = active.map((e: any) => Number(e.course_id));
        enrollProgress.value = Object.fromEntries(active.map((e: any) => [Number(e.course_id), e.progress_percentage || 0]));
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || 'Gagal memuat kursus pengguna');
    } finally {
        loadingEnrollments.value = false;
    }
};

const saveEnrollments = async () => {
    if (!enrollUser.value) return;
    isSavingEnrollments.value = true;
    try {
        const res: any = await $fetch(`/api/admin/users/${enrollUser.value.id}/enrollments`, {
            method: 'POST',
            body: { course_ids: enrollCourseIds.value },
        });
        swal.toastSuccess(`Akses kursus diperbarui: ${res.activated_count} ditambahkan, ${res.revoked_count} dicabut.`);
        isEnrollModalOpen.value = false;
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || 'Gagal menyimpan akses kursus');
    } finally {
        isSavingEnrollments.value = false;
    }
};

const escapeHtml = (text: string) =>
    String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

const courseStatusLabel = (status: string) => (status === 'published' ? '' : status);

const editForm = ref({
    id: '',
    name: '',
    email: '',
    role: 'STUDENT',
});

const bulkForm = ref({
    raw_users: '',
    default_role: 'STUDENT',
    default_password: '',
    course_ids: [] as number[],
});

const openBulkModal = () => {
    courseSearch.value = '';
    isBulkModalOpen.value = true;
    loadCourseOptions();
};
const isSubmittingBulk = ref(false);

const loadUsers = async () => {
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        usersList.value = data || [];
    } catch (err: any) {
        console.error('Failed to load users:', err);
    } finally {
        loading.value = false;
    }
};

const stats = computed(() => {
    const total = usersList.value.length;
    const students = usersList.value.filter(u => u.role === 'STUDENT').length;
    const instructors = usersList.value.filter(u => u.role === 'INSTRUCTOR').length;
    const admins = usersList.value.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
    return { total, students, instructors, admins };
});

const filteredUsers = computed(() => {
    let list = usersList.value;
    if (activeRole.value !== 'all') {
        list = list.filter(u => u.role?.toLowerCase() === activeRole.value.toLowerCase());
    }
    if (search.value.trim()) {
        const q = search.value.toLowerCase().trim();
        list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    return list;
});

const openEditModal = (u: any) => {
    selectedUser.value = u;
    editForm.value = {
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'STUDENT',
    };
    isEditModalOpen.value = true;
};

const saveEditUser = async () => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                name: editForm.value.name,
                role: editForm.value.role,
            })
            .eq('id', editForm.value.id);

        if (error) throw error;
        swal.toastSuccess('Peran dan profil pengguna berhasil diperbarui!');
        isEditModalOpen.value = false;
        loadUsers();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal memperbarui pengguna');
    }
};

const createUser = async () => {
    if (!singleForm.value.name || !singleForm.value.email || !singleForm.value.password) {
        swal.toastError('Nama, email, dan kata sandi wajib diisi.');
        return;
    }

    isSubmittingSingle.value = true;
    try {
        const res: any = await $fetch('/api/admin/users', {
            method: 'POST',
            body: singleForm.value,
        });

        isAddManualOpen.value = false;
        loadUsers();

        const waBtnHtml = res.whatsapp_url
            ? `<div class="mt-4"><a href="${res.whatsapp_url}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition">Kirim Info Login via WhatsApp &rarr;</a></div>`
            : '<p class="text-slate-500 text-[11px]">Nomor WhatsApp tidak diisi, silakan sampaikan info login secara manual.</p>';

        swal.fireCustom({
            icon: 'success',
            title: 'Pengguna Berhasil Ditambahkan!',
            html: `
                <div class="text-left text-xs space-y-2">
                    <p>Akun: <strong>${escapeHtml(res.user_name)}</strong> (${escapeHtml(res.user_email)})</p>
                    <p>Didaftarkan ke <strong>${res.enrolled_count}</strong> kursus.</p>
                    ${waBtnHtml}
                </div>
            `,
            confirmButtonText: 'Tutup',
        });
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message || 'Gagal mendaftarkan pengguna');
    } finally {
        isSubmittingSingle.value = false;
    }
};

const handleBulkImport = async () => {
    if (!bulkForm.value.raw_users.trim()) {
        swal.toastError('Masukkan data teks pengguna terlebih dahulu.');
        return;
    }

    isSubmittingBulk.value = true;
    try {
        const res: any = await $fetch('/api/admin/users/bulk', {
            method: 'POST',
            body: bulkForm.value,
        });

        swal.fireSuccess('Import Berhasil!', res.message);
        isBulkModalOpen.value = false;
        bulkForm.value.raw_users = '';
        bulkForm.value.course_ids = [];
        loadUsers();
    } catch (err: any) {
        swal.fireError('Import Gagal', err.data?.statusMessage || err.message);
    } finally {
        isSubmittingBulk.value = false;
    }
};

const handleResetPassword = async (u: any) => {
    const isConfirmed = await swal.confirmDialog({
        title: 'Reset Kata Sandi?',
        text: `Kata sandi baru akan dibuat untuk pengguna ${u.name} (${u.email}) dan dapat langsung dikirim via WhatsApp.`,
        confirmButtonText: 'Reset Password Sekarang',
        confirmButtonColor: '#7c3aed',
    });

    if (!isConfirmed) return;

    try {
        const res: any = await $fetch(`/api/admin/users/${u.id}/reset-password`, {
            method: 'POST',
        });

        const waBtnHtml = res.whatsapp_url
            ? `<div class="mt-4"><a href="${res.whatsapp_url}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition">Kirim Password via WhatsApp &rarr;</a></div>`
            : '';

        swal.fireCustom({
            icon: 'success',
            title: 'Password Berhasil Direset!',
            html: `
                <div class="text-left text-xs space-y-2">
                    <p>Akun: <strong>${escapeHtml(res.user_name)}</strong> (${escapeHtml(res.user_email)})</p>
                    <div class="p-3 bg-slate-100 rounded-xl font-mono text-sm text-purple-700 font-bold select-all">
                        ${escapeHtml(res.new_password)}
                    </div>
                    <p class="text-slate-500 text-[11px]">Silakan salin password di atas atau kirim langsung ke WhatsApp pengguna:</p>
                    ${waBtnHtml}
                </div>
            `,
            confirmButtonText: 'Tutup',
        });
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message || 'Gagal mereset kata sandi');
    }
};

const deleteUser = async (u: any) => {
    const isConfirmed = await swal.confirmDialog({
        title: 'Hapus Pengguna?',
        text: `Akun "${u.name}" (${u.email}) beserta progres belajar dan sertifikatnya akan dihapus permanen.`,
        confirmButtonText: 'Ya, Hapus',
        confirmButtonColor: '#ef4444',
    });

    if (!isConfirmed) return;

    try {
        await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
        swal.toastSuccess('Pengguna berhasil dihapus.');
        loadUsers();
    } catch (err: any) {
        swal.fireError('Tidak Bisa Dihapus', err.data?.statusMessage || err.message || 'Gagal menghapus pengguna.');
    }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

onMounted(() => {
    loadUsers();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Manajemen Pengguna
                </h1>
                <p class="text-xs text-slate-500">Kelola akun pengguna, hak akses peran (Role), dan profil.</p>
            </div>

            <div class="flex items-center gap-2">
                <Button variant="secondary" size="md" @click="openBulkModal">
                    <UploadCloud class="mr-1.5 h-4 w-4" />
                    <span>Import Massal</span>
                </Button>
                <Button variant="primary" size="md" @click="openAddManual">
                    <UserPlus class="mr-1.5 h-4 w-4" />
                    <span>Tambah Pengguna</span>
                </Button>
            </div>
        </div>

        <div class="space-y-6">
            <!-- Stats Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div class="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Total Pengguna</p>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ stats.total }}</p>
                    </div>
                    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <Users class="h-5 w-5" />
                    </div>
                </div>

                <div class="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Total Siswa</p>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ stats.students }}</p>
                    </div>
                    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <BookOpen class="h-5 w-5" />
                    </div>
                </div>

                <div class="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Instruktur</p>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ stats.instructors }}</p>
                    </div>
                    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                        <GraduationCap class="h-5 w-5" />
                    </div>
                </div>

                <div class="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-semibold text-slate-400">Administrator</p>
                        <p class="text-2xl font-black text-slate-900 dark:text-white mt-1">{{ stats.admins }}</p>
                    </div>
                    <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                        <Shield class="h-5 w-5" />
                    </div>
                </div>
            </div>

            <!-- Table & Filters Section -->
            <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <!-- Role Filter Chips -->
                    <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        <button
                            v-for="r in ['all', 'STUDENT', 'INSTRUCTOR', 'ADMIN']"
                            :key="r"
                            type="button"
                            @click="activeRole = r"
                            :class="[
                                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                                activeRole === r
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                            ]"
                        >
                            {{ r === 'all' ? 'Semua Role' : r }}
                        </button>
                    </div>

                    <!-- Search Input -->
                    <div class="relative w-full sm:w-64">
                        <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            v-model="search"
                            type="text"
                            placeholder="Cari nama atau email..."
                            class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                </div>

                <div v-if="loading" class="py-12">
                    <LoadingState text="Memuat daftar pengguna..." />
                </div>

                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-6 py-3.5">Nama & Profil</th>
                                <th class="px-6 py-3.5">Email</th>
                                <th class="px-6 py-3.5">Peran (Role)</th>
                                <th class="px-6 py-3.5">Terdaftar</th>
                                <th class="px-6 py-3.5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td class="px-6 py-3.5 flex items-center gap-3">
                                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        {{ u.name ? u.name[0].toUpperCase() : 'U' }}
                                    </div>
                                    <div>
                                        <p class="font-bold text-slate-900 dark:text-white">{{ u.name || 'User' }}</p>
                                        <p class="text-[11px] text-slate-400 font-mono">{{ u.id?.substring(0, 8) }}...</p>
                                    </div>
                                </td>
                                <td class="px-6 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                                    {{ u.email }}
                                </td>
                                <td class="px-6 py-3.5">
                                    <Badge
                                        :variant="u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'purple' : (u.role === 'INSTRUCTOR' ? 'primary' : 'gray')"
                                        size="sm"
                                    >
                                        {{ u.role || 'STUDENT' }}
                                    </Badge>
                                </td>
                                <td class="px-6 py-3.5 text-slate-400">
                                    {{ formatDate(u.created_at) }}
                                </td>
                                <td class="px-6 py-3.5 text-right">
                                    <div class="flex items-center justify-end gap-1.5">
                                        <button
                                            type="button"
                                            @click="openEnrollModal(u)"
                                            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                                            title="Atur kursus yang bisa diakses"
                                        >
                                            <BookOpen class="h-3 w-3" />
                                            <span>Kursus</span>
                                        </button>
                                        <button
                                            type="button"
                                            @click="openEditModal(u)"
                                            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                            title="Ubah peran"
                                        >
                                            <Edit3 class="h-3 w-3" />
                                            <span>Role</span>
                                        </button>
                                        <button
                                            type="button"
                                            @click="handleResetPassword(u)"
                                            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[11px] font-semibold text-purple-700 dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300"
                                            title="Reset kata sandi & buat link WA"
                                        >
                                            <Key class="h-3 w-3" />
                                            <span>Reset WA</span>
                                        </button>
                                        <button
                                            type="button"
                                            @click="deleteUser(u)"
                                            class="inline-flex items-center p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-900 dark:hover:bg-rose-950"
                                            title="Hapus pengguna"
                                        >
                                            <Trash2 class="h-3 w-3" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL: ADD MANUAL USER -->
        <Modal :show="isAddManualOpen" title="Tambah Pengguna Baru" @close="isAddManualOpen = false">
            <div class="space-y-4">
                <Input
                    v-model="singleForm.name"
                    label="Nama Lengkap *"
                    placeholder="Contoh: Ahmad Fauzan"
                    required
                />
                <Input
                    v-model="singleForm.email"
                    type="email"
                    label="Alamat Email *"
                    placeholder="ahmad@example.com"
                    required
                />
                <Input
                    v-model="singleForm.password"
                    type="password"
                    label="Kata Sandi *"
                    placeholder="Minimal 6 karakter"
                    required
                />
                <Select
                    v-model="singleForm.role"
                    label="Peran Akun (Role) *"
                    required
                >
                    <option value="STUDENT">STUDENT (Siswa Belajar)</option>
                    <option value="INSTRUCTOR">INSTRUCTOR (Instruktur Kursus)</option>
                    <option value="ADMIN">ADMIN (Administrator Platform)</option>
                </Select>
                <Input
                    v-model="singleForm.whatsapp_number"
                    label="Nomor WhatsApp (opsional)"
                    placeholder="08123456789"
                />
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Daftarkan ke Kursus (opsional)
                    </label>
                    <input
                        v-model="courseSearch"
                        type="text"
                        placeholder="Cari judul kursus..."
                        class="w-full mb-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <div class="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        <label
                            v-for="c in filteredCourseOptions"
                            :key="c.id"
                            class="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            <input v-model="singleForm.course_ids" type="checkbox" :value="c.id" class="rounded" />
                            <span class="flex-1 text-slate-800 dark:text-slate-200">{{ c.title }}</span>
                            <Badge v-if="courseStatusLabel(c.status)" variant="gray" size="sm">{{ c.status }}</Badge>
                        </label>
                        <p v-if="!filteredCourseOptions.length" class="px-3 py-3 text-xs text-slate-400">Tidak ada kursus.</p>
                    </div>
                    <p class="mt-1 text-[11px] text-slate-400">{{ singleForm.course_ids.length }} kursus dipilih</p>
                </div>
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isAddManualOpen = false">Batal</Button>
                <Button variant="primary" size="sm" :disabled="isSubmittingSingle" @click="createUser">
                    {{ isSubmittingSingle ? 'Mendaftarkan...' : 'Daftarkan Akun' }}
                </Button>
            </template>
        </Modal>

        <!-- MODAL: ATUR KURSUS PENGGUNA -->
        <Modal :show="isEnrollModalOpen" title="Atur Akses Kursus" @close="isEnrollModalOpen = false">
            <div class="space-y-3">
                <p class="text-xs text-slate-600 dark:text-slate-300">
                    Pengguna: <strong>{{ enrollUser?.name }}</strong> ({{ enrollUser?.email }})
                </p>
                <p class="text-[11px] text-slate-400">
                    Centang kursus yang boleh diakses. Menghapus centang akan mencabut akses, tetapi progres belajarnya tetap tersimpan.
                </p>
                <div v-if="loadingEnrollments" class="py-6">
                    <LoadingState text="Memuat kursus pengguna..." />
                </div>
                <template v-else>
                    <input
                        v-model="courseSearch"
                        type="text"
                        placeholder="Cari judul kursus..."
                        class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <div class="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        <label
                            v-for="c in filteredCourseOptions"
                            :key="c.id"
                            class="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            <input v-model="enrollCourseIds" type="checkbox" :value="c.id" class="rounded" />
                            <span class="flex-1 text-slate-800 dark:text-slate-200">{{ c.title }}</span>
                            <span v-if="enrollProgress[c.id] !== undefined" class="text-[10px] text-emerald-600 font-semibold">
                                Progres {{ enrollProgress[c.id] }}%
                            </span>
                            <Badge v-if="courseStatusLabel(c.status)" variant="gray" size="sm">{{ c.status }}</Badge>
                        </label>
                        <p v-if="!filteredCourseOptions.length" class="px-3 py-3 text-xs text-slate-400">Tidak ada kursus.</p>
                    </div>
                    <p class="text-[11px] text-slate-400">{{ enrollCourseIds.length }} kursus dicentang</p>
                </template>
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isEnrollModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" :disabled="isSavingEnrollments || loadingEnrollments" @click="saveEnrollments">
                    {{ isSavingEnrollments ? 'Menyimpan...' : 'Simpan Akses Kursus' }}
                </Button>
            </template>
        </Modal>

        <!-- MODAL: EDIT USER & ROLE -->
        <Modal :show="isEditModalOpen" title="Ubah Peran & Profil Pengguna" @close="isEditModalOpen = false">
            <div class="space-y-4">
                <Input
                    v-model="editForm.name"
                    label="Nama Lengkap"
                />
                <Input
                    v-model="editForm.email"
                    label="Email"
                    disabled
                />
                <Select
                    v-model="editForm.role"
                    label="Peran Akun (Role) *"
                    required
                >
                    <option value="STUDENT">STUDENT (Siswa Belajar)</option>
                    <option value="INSTRUCTOR">INSTRUCTOR (Instruktur Kursus)</option>
                    <option value="ADMIN">ADMIN (Administrator)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Hak Akses Penuh)</option>
                </Select>
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isEditModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" @click="saveEditUser">Simpan Perubahan</Button>
            </template>
        </Modal>

        <!-- MODAL: BULK IMPORT USERS -->
        <Modal :show="isBulkModalOpen" title="Import Massal Pengguna" @close="isBulkModalOpen = false">
            <div class="space-y-4">
                <div class="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 text-xs text-indigo-800 dark:text-indigo-300 space-y-1">
                    <p class="font-bold">Format Baris Teks (CSV / Delimiter):</p>
                    <code class="block font-mono text-[11px] text-indigo-900 dark:text-indigo-200">Nama, Email, Password, Role, WhatsApp</code>
                    <p class="text-[10px] text-indigo-600 dark:text-indigo-400">Contoh: <code>Fauzan, fauzan@gmail.com, Pass123, STUDENT, 08123456789</code></p>
                    <p class="text-[10px] text-indigo-600 dark:text-indigo-400">Password, Role, dan WhatsApp boleh dikosongkan (memakai nilai default). Email yang sudah terdaftar hanya ditambahkan kursusnya.</p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <Select v-model="bulkForm.default_role" label="Peran Default (Role)">
                        <option value="STUDENT">STUDENT (Siswa)</option>
                        <option value="INSTRUCTOR">INSTRUCTOR (Instruktur)</option>
                        <option value="ADMIN">ADMIN (Administrator)</option>
                    </Select>
                    <Input
                        v-model="bulkForm.default_password"
                        label="Password Default"
                        placeholder="Mio123456!"
                    />
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Data Pengguna (Teks Multiline / JSON) *
                    </label>
                    <textarea
                        v-model="bulkForm.raw_users"
                        rows="6"
                        placeholder="Ahmad Fauzan, ahmad@gmail.com, Pass123, STUDENT, 08123456789&#10;Siti Aisyah, siti@gmail.com, Pass123, STUDENT, 08198765432"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    ></textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Daftarkan Semua ke Kursus (opsional)
                    </label>
                    <input
                        v-model="courseSearch"
                        type="text"
                        placeholder="Cari judul kursus..."
                        class="w-full mb-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <div class="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        <label
                            v-for="c in filteredCourseOptions"
                            :key="c.id"
                            class="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                            <input v-model="bulkForm.course_ids" type="checkbox" :value="c.id" class="rounded" />
                            <span class="flex-1 text-slate-800 dark:text-slate-200">{{ c.title }}</span>
                            <Badge v-if="courseStatusLabel(c.status)" variant="gray" size="sm">{{ c.status }}</Badge>
                        </label>
                        <p v-if="!filteredCourseOptions.length" class="px-3 py-3 text-xs text-slate-400">Tidak ada kursus.</p>
                    </div>
                    <p class="mt-1 text-[11px] text-slate-400">{{ bulkForm.course_ids.length }} kursus dipilih untuk semua peserta di atas</p>
                </div>
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isBulkModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" :disabled="isSubmittingBulk" @click="handleBulkImport">
                    {{ isSubmittingBulk ? 'Memproses Import...' : 'Mulai Import Massal' }}
                </Button>
            </template>
        </Modal>
    </div>
</template>
