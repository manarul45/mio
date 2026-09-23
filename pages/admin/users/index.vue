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
const selectedUser = ref<any>(null);

const singleForm = ref({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
});

const editForm = ref({
    id: '',
    name: '',
    email: '',
    role: 'STUDENT',
});

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
    if (!singleForm.value.email || !singleForm.value.password) {
        swal.toastError('Email dan password wajib diisi.');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email: singleForm.value.email,
            password: singleForm.value.password,
            options: {
                data: {
                    name: singleForm.value.name,
                    role: singleForm.value.role,
                }
            }
        });

        if (error) throw error;

        // Also upsert to profiles
        if (data.user) {
            await supabase.from('profiles').upsert({
                id: data.user.id,
                name: singleForm.value.name,
                email: singleForm.value.email,
                role: singleForm.value.role,
            });
        }

        swal.toastSuccess('Pengguna baru berhasil didaftarkan!');
        isAddManualOpen.value = false;
        singleForm.value = { name: '', email: '', password: '', role: 'STUDENT' };
        loadUsers();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal mendaftarkan pengguna');
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
                <Button variant="primary" size="md" @click="isAddManualOpen = true">
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
                                    <button
                                        type="button"
                                        @click="openEditModal(u)"
                                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                        <Edit3 class="h-3 w-3" />
                                        <span>Ubah Role</span>
                                    </button>
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
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isAddManualOpen = false">Batal</Button>
                <Button variant="primary" size="sm" @click="createUser">Daftarkan Akun</Button>
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
    </div>
</template>
