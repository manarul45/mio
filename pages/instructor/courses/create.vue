<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from '~/components/UI/Button.vue';
import Input from '~/components/UI/Input.vue';
import Select from '~/components/UI/Select.vue';
import Textarea from '~/components/UI/Textarea.vue';
import { useSwal } from '~/composables/useSwal';
import {
    ArrowLeft,
    Plus,
    Trash2,
    BookOpen,
    DollarSign,
    Sparkles,
    UploadCloud,
    Loader2,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user } = useAuthProfile();
const supabase = useSupabaseClient();
const swal = useSwal();

const categories = ref<any[]>([]);
const isSubmitting = ref(false);
const isUploadingThumbnail = ref(false);

const form = ref({
    title: '',
    subtitle: '',
    category_id: '',
    level: 'beginner',
    language: 'id',
    price: 199000,
    discount_price: null as number | null,
    thumbnail: '',
    preview_video_id: '',
    description: '',
    learning_objectives: [''],
    requirements: [''],
    target_audience: [''],
    whatsapp_group_url: '',
});

const addObjective = () => form.value.learning_objectives.push('');
const removeObjective = (idx: number) => form.value.learning_objectives.splice(idx, 1);

const addRequirement = () => form.value.requirements.push('');
const removeRequirement = (idx: number) => form.value.requirements.splice(idx, 1);

const addAudience = () => form.value.target_audience.push('');
const removeAudience = (idx: number) => form.value.target_audience.splice(idx, 1);

const loadCategories = async () => {
    try {
        const { data } = await supabase.from('categories').select('*').order('name');
        categories.value = data || [];
        if (categories.value.length > 0) {
            form.value.category_id = categories.value[0].id;
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
};

const handleThumbnailUpload = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    isUploadingThumbnail.value = true;
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'courses');
        formData.append('folder', 'thumbnails');

        const res: any = await $fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (res?.url) {
            form.value.thumbnail = res.url;
            swal.toastSuccess('Thumbnail berhasil diunggah!');
        } else {
            throw new Error(res?.message || 'Gagal mengunggah thumbnail');
        }
    } catch (error: any) {
        swal.toastError(error.data?.statusMessage || error.message || 'Gagal mengunggah thumbnail.');
    } finally {
        isUploadingThumbnail.value = false;
        event.target.value = '';
    }
};

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

const submit = async () => {
    if (!form.value.title.trim()) {
        swal.toastError('Judul kursus wajib diisi!');
        return;
    }

    if (!user.value) {
        swal.toastError('Harap login terlebih dahulu');
        return;
    }

    isSubmitting.value = true;
    try {
        const res: any = await $fetch('/api/instructor/courses', {
            method: 'POST',
            body: {
                title: form.value.title,
                subtitle: form.value.subtitle,
                description: form.value.description,
                category_id: form.value.category_id || null,
                instructor_id: user.value.id,
                level: form.value.level,
                language: form.value.language,
                price: Number(form.value.price) || 0,
                discount_price: form.value.discount_price ? Number(form.value.discount_price) : null,
                thumbnail_url: form.value.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
                preview_video_id: form.value.preview_video_id,
                learning_objectives: form.value.learning_objectives.filter(Boolean),
                requirements: form.value.requirements.filter(Boolean),
                target_audience: form.value.target_audience.filter(Boolean),
                whatsapp_group_url: form.value.whatsapp_group_url,
                status: 'draft',
            }
        });

        const createdCourse = res?.data;
        if (!createdCourse?.id) {
            throw new Error('Gagal mendapatkan ID kursus yang dibuat');
        }

        swal.toastSuccess('Kursus baru berhasil dibuat! Membuka studio silabus...');
        navigateTo(`/instructor/courses/${createdCourse.id}/edit`);
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message || 'Gagal membuat kursus.');
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(() => {
    loadCategories();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <NuxtLink
                to="/instructor/courses"
                class="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
                <ArrowLeft class="h-5 w-5" />
            </NuxtLink>
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Buat Kursus Baru
                </h1>
                <p class="text-xs text-slate-500">Langkah 1: Isi informasi dasar kursus Anda.</p>
            </div>
        </div>

        <form @submit.prevent="submit" class="max-w-4xl mx-auto space-y-8 pb-12">
            <!-- Basic Information Card -->
            <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div class="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <BookOpen class="h-5 w-5 text-indigo-600" />
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Informasi Dasar Kursus</h2>
                </div>

                <div class="space-y-4">
                    <Input
                        v-model="form.title"
                        label="Judul Kursus *"
                        placeholder="Contoh: Masterclass Full-Stack Web Development"
                        required
                    />

                    <Input
                        v-model="form.subtitle"
                        label="Subjudul / Tagline Singkat"
                        placeholder="Contoh: Bangun aplikasi nyata dari nol hingga deploy ke production"
                    />

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="space-y-1">
                            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Kategori *</label>
                            <select
                                v-model="form.category_id"
                                class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                                required
                            >
                                <option value="" disabled>-- Pilih Kategori --</option>
                                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                                    {{ cat.name }}
                                </option>
                            </select>
                        </div>

                        <Select
                            v-model="form.level"
                            label="Tingkat Keahlian *"
                            required
                        >
                            <option value="beginner">Pemula (Beginner)</option>
                            <option value="intermediate">Menengah (Intermediate)</option>
                            <option value="expert">Mahir (Expert)</option>
                            <option value="all_levels">Semua Tingkat (All Levels)</option>
                        </Select>

                        <Select
                            v-model="form.language"
                            label="Bahasa Pengantar *"
                            required
                        >
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                        </Select>
                    </div>

                    <Textarea
                        v-model="form.description"
                        label="Deskripsi Lengkap Kursus"
                        placeholder="Jelaskan detail materi, kurikulum, dan manfaat yang akan didapatkan peserta..."
                        rows="4"
                    />
                </div>
            </div>

            <!-- Media & Pricing Card -->
            <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div class="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <DollarSign class="h-5 w-5 text-emerald-600" />
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Media & Penetapan Harga</h2>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-model="form.price"
                        type="number"
                        label="Harga Normal (Rp) *"
                        placeholder="199000"
                        required
                    />

                    <Input
                        v-model="form.discount_price"
                        type="number"
                        label="Harga Diskon / Promo (Rp)"
                        placeholder="Opsional, contoh: 149000"
                    />
                </div>

                <div class="space-y-4">
                    <div class="space-y-1.5">
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Thumbnail Gambar Kursus
                        </label>
                        <div class="flex items-center gap-2">
                            <input
                                type="text"
                                v-model="form.thumbnail"
                                placeholder="Tempel URL gambar atau upload file..."
                                class="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            />
                            <label class="cursor-pointer px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition shadow-sm">
                                <Loader2 v-if="isUploadingThumbnail" class="h-4 w-4 animate-spin" />
                                <UploadCloud v-else class="h-4 w-4" />
                                <span>{{ isUploadingThumbnail ? 'Mengunggah...' : 'Upload File' }}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    @change="handleThumbnailUpload"
                                    class="hidden"
                                    :disabled="isUploadingThumbnail"
                                />
                            </label>
                        </div>
                        <div v-if="form.thumbnail" class="mt-2 relative w-48 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                            <img :src="form.thumbnail" alt="Thumbnail Preview" class="w-full h-full object-cover" />
                        </div>
                    </div>

                    <Input
                        v-model="form.preview_video_id"
                        label="YouTube Video Trailer / Preview ID"
                        placeholder="Contoh: dQw4w9WgXcQ (ID saja atau link video)"
                    />
                </div>
            </div>

            <!-- Learning Goals -->
            <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div class="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <Sparkles class="h-5 w-5 text-amber-500" />
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Target Capaian Pembelajaran</h2>
                </div>

                <div class="space-y-3">
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Apa yang akan dipelajari siswa dari kursus ini?
                    </label>
                    <div v-for="(obj, idx) in form.learning_objectives" :key="idx" class="flex items-center gap-2">
                        <input
                            v-model="form.learning_objectives[idx]"
                            type="text"
                            placeholder="Contoh: Mampu membangun API RESTful dengan database Supabase"
                            class="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                        <button
                            v-if="form.learning_objectives.length > 1"
                            type="button"
                            @click="removeObjective(idx)"
                            class="p-2 text-slate-400 hover:text-rose-600"
                        >
                            <Trash2 class="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        type="button"
                        @click="addObjective"
                        class="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                    >
                        <Plus class="h-3.5 w-3.5" />
                        <span>Tambah Capaian Belajar</span>
                    </button>
                </div>
            </div>

            <div class="flex items-center justify-end gap-4 pt-4">
                <Button as="Link" href="/instructor/courses" variant="secondary" size="md">
                    Batal
                </Button>
                <Button type="submit" variant="primary" size="md" :loading="isSubmitting">
                    <span>Simpan & Rancang Silabus</span>
                </Button>
            </div>
        </form>
    </div>
</template>
