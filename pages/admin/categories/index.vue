<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import Input from '~/components/UI/Input.vue';
import Textarea from '~/components/UI/Textarea.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useSwal } from '~/composables/useSwal';
import {
    Plus,
    FolderTree,
    Edit3,
    Trash2,
    Search,
    BookOpen,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const categories = ref<any[]>([]);
const search = ref('');
const isModalOpen = ref(false);
const editingCategory = ref<any>(null);

const form = ref({
    name: '',
    description: '',
    is_active: true,
});

const loadCategories = async () => {
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*, courses(count)')
            .order('name');

        if (error) throw error;
        categories.value = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            is_active: c.is_active ?? true,
            courses_count: c.courses?.[0]?.count || 0,
        }));
    } catch (err: any) {
        console.error('Failed to load categories:', err);
    } finally {
        loading.value = false;
    }
};

const filteredCategories = computed(() => {
    if (!search.value.trim()) return categories.value;
    const q = search.value.toLowerCase().trim();
    return categories.value.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
});

const openCreateModal = () => {
    editingCategory.value = null;
    form.value = { name: '', description: '', is_active: true };
    isModalOpen.value = true;
};

const openEditModal = (cat: any) => {
    editingCategory.value = cat;
    form.value = {
        name: cat.name,
        description: cat.description || '',
        is_active: cat.is_active,
    };
    isModalOpen.value = true;
};

const slugify = (text: string) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '');
};

const saveCategory = async () => {
    if (!form.value.name.trim()) {
        swal.toastError('Nama kategori wajib diisi.');
        return;
    }

    try {
        if (editingCategory.value) {
            const { error } = await supabase
                .from('categories')
                .update({
                    name: form.value.name,
                    description: form.value.description,
                    is_active: form.value.is_active,
                })
                .eq('id', editingCategory.value.id);

            if (error) throw error;
            swal.toastSuccess('Kategori berhasil diperbarui!');
        } else {
            const { error } = await supabase
                .from('categories')
                .insert({
                    name: form.value.name,
                    slug: slugify(form.value.name),
                    description: form.value.description,
                    is_active: form.value.is_active,
                });

            if (error) throw error;
            swal.toastSuccess('Kategori baru berhasil ditambahkan!');
        }
        isModalOpen.value = false;
        loadCategories();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menyimpan kategori');
    }
};

const deleteCategory = async (cat: any) => {
    if (cat.courses_count > 0) {
        swal.toastWarning(`Kategori "${cat.name}" masih memiliki ${cat.courses_count} kursus. Hapus atau pindahkan kursus terlebih dahulu.`);
        return;
    }

    const ok = await swal.confirmDialog({
        title: 'Hapus Kategori?',
        text: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`,
        confirmButtonColor: '#e11d48',
    });
    if (!ok) return;

    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', cat.id);

        if (error) throw error;
        swal.toastSuccess('Kategori berhasil dihapus!');
        loadCategories();
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

onMounted(() => {
    loadCategories();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
                    <FolderTree class="h-6 w-6" />
                </div>
                <div>
                    <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                        Kategori Kursus
                    </h1>
                    <p class="text-xs text-slate-500">Kelola klasifikasi bidang keilmuan dan tag navigasi katalog kursus.</p>
                </div>
            </div>

            <Button variant="primary" size="md" @click="openCreateModal">
                <Plus class="mr-1.5 h-4 w-4" />
                <span>Tambah Kategori</span>
            </Button>
        </div>

        <div class="space-y-6">
            <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">
                        Daftar Kategori ({{ categories.length }})
                    </h3>

                    <div class="relative w-full sm:w-64">
                        <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            v-model="search"
                            type="text"
                            placeholder="Cari kategori..."
                            class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                    </div>
                </div>

                <div v-if="loading" class="py-12">
                    <LoadingState text="Memuat daftar kategori..." />
                </div>

                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-6 py-3.5">Nama Kategori</th>
                                <th class="px-6 py-3.5">Slug URL</th>
                                <th class="px-6 py-3.5">Deskripsi</th>
                                <th class="px-6 py-3.5">Jumlah Kursus</th>
                                <th class="px-6 py-3.5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="cat in filteredCategories" :key="cat.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <td class="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                                    {{ cat.name }}
                                </td>
                                <td class="px-6 py-3.5 font-mono text-slate-500">
                                    {{ cat.slug }}
                                </td>
                                <td class="px-6 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                    {{ cat.description || '-' }}
                                </td>
                                <td class="px-6 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ cat.courses_count }} Kursus
                                </td>
                                <td class="px-6 py-3.5 text-right space-x-2">
                                    <button
                                        type="button"
                                        @click="openEditModal(cat)"
                                        class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        title="Edit Kategori"
                                    >
                                        <Edit3 class="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        @click="deleteCategory(cat)"
                                        class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        title="Hapus Kategori"
                                    >
                                        <Trash2 class="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL ADD/EDIT -->
        <Modal :show="isModalOpen" :title="editingCategory ? 'Edit Kategori Kursus' : 'Tambah Kategori Baru'" @close="isModalOpen = false">
            <div class="space-y-4">
                <Input
                    v-model="form.name"
                    label="Nama Kategori *"
                    placeholder="Contoh: Web Development"
                    required
                />
                <Textarea
                    v-model="form.description"
                    label="Deskripsi Singkat"
                    placeholder="Penjelasan cakupan topik dalam kategori ini..."
                    rows="3"
                />
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" @click="saveCategory">Simpan</Button>
            </template>
        </Modal>
    </div>
</template>
