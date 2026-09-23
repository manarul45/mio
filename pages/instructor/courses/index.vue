<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import EmptyState from '~/components/UI/EmptyState.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useSwal } from '~/composables/useSwal';
import {
    Plus,
    Video,
    FileQuestion,
    Users,
    Edit3,
    ExternalLink,
    AlertCircle,
    Trash2,
    Play,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user, isAdmin } = useAuthProfile();
const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const courses = ref<any[]>([]);

const formatRupiah = (val: number) => {
    if (!val) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(val);
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'published':
            return { variant: 'success', text: 'Published' };
        case 'submitted':
            return { variant: 'warning', text: 'Menunggu Review' };
        case 'rejected':
            return { variant: 'danger', text: 'Ditolak' };
        default:
            return { variant: 'secondary', text: 'Draft' };
    }
};

const loadCourses = async () => {
    if (!user.value) return;
    loading.value = true;
    try {
        let query = supabase
            .from('courses')
            .select(`
                id,
                title,
                slug,
                thumbnail:thumbnail_url,
                price,
                discount_price,
                status,
                moderation_notes,
                created_at,
                categories:category_id(name),
                sections:course_sections(
                    id,
                    lessons(id),
                    quizzes(id)
                ),
                enrollments(count)
            `)
            .order('created_at', { ascending: false });

        if (!isAdmin.value) {
            query = query.eq('instructor_id', user.value.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        courses.value = (data || []).map((c: any) => {
            let totalLessons = 0;
            let totalQuizzes = 0;
            (c.sections || []).forEach((s: any) => {
                totalLessons += (s.lessons || []).length;
                totalQuizzes += (s.quizzes || []).length;
            });

            return {
                id: c.id,
                title: c.title,
                slug: c.slug,
                thumbnail: c.thumbnail,
                price: c.price,
                discount_price: c.discount_price,
                status: c.status,
                moderation_notes: c.moderation_notes,
                category: c.categories,
                lessons_count: totalLessons,
                quizzes_count: totalQuizzes,
                enrollments_count: c.enrollments?.[0]?.count || 0,
            };
        });
    } catch (err) {
        console.error('Failed to load instructor courses:', err);
    } finally {
        loading.value = false;
    }
};

const deleteCourse = async (course: any) => {
    const confirmed = await swal.confirmDialog({
        title: 'Hapus Kursus?',
        text: `Apakah Anda yakin ingin menghapus kursus "${course.title}" beserta seluruh materinya?`,
        confirmButtonText: 'Ya, Hapus Kursus',
        confirmButtonColor: '#e11d48',
    });

    if (confirmed) {
        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', course.id);

            if (error) throw error;
            swal.toastSuccess('Kursus berhasil dihapus.');
            loadCourses();
        } catch (err: any) {
            swal.toastError(err.message || 'Gagal menghapus kursus');
        }
    }
};

onMounted(() => {
    loadCourses();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between w-full">
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Manajemen Kursus Saya
                </h1>
                <p class="text-xs text-slate-500">Kelola kurikulum video pembelajaran, kuis, dan pantau status publikasi.</p>
            </div>

            <Button as="NuxtLink" href="/instructor/courses/create" variant="primary" size="md">
                <Plus class="mr-1.5 h-4 w-4" />
                <span>Buat Kursus Baru</span>
            </Button>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat daftar kursus Anda..." />
        </div>

        <div v-else class="space-y-6">
            <!-- Courses List -->
            <div v-if="courses.length > 0" class="space-y-4">
                <div
                    v-for="course in courses"
                    :key="course.id"
                    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                    <div class="flex gap-4 items-start min-w-0">
                        <img
                            :src="course.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80'"
                            :alt="course.title"
                            class="h-20 w-32 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                        <div class="space-y-1.5 min-w-0">
                            <div class="flex items-center gap-2">
                                <Badge :variant="getStatusBadge(course.status).variant" size="sm">
                                    {{ getStatusBadge(course.status).text }}
                                </Badge>
                                <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                    {{ course.category?.name || 'General' }}
                                </span>
                            </div>

                            <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">
                                {{ course.title }}
                            </h3>

                            <!-- Stats Row -->
                            <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                                <span class="flex items-center gap-1">
                                    <Video class="h-3.5 w-3.5" />
                                    <span>{{ course.lessons_count }} Video</span>
                                </span>
                                <span class="text-slate-300 dark:text-slate-700">•</span>
                                <span class="flex items-center gap-1">
                                    <FileQuestion class="h-3.5 w-3.5" />
                                    <span>{{ course.quizzes_count }} Kuis</span>
                                </span>
                                <span class="text-slate-300 dark:text-slate-700">•</span>
                                <span class="flex items-center gap-1">
                                    <Users class="h-3.5 w-3.5" />
                                    <span>{{ course.enrollments_count }} Student</span>
                                </span>
                                <span class="text-slate-300 dark:text-slate-700">•</span>
                                <span class="font-bold text-slate-900 dark:text-white">
                                    {{ formatRupiah(course.discount_price || course.price) }}
                                </span>
                            </div>

                            <!-- Rejection Reason Alert if rejected -->
                            <div v-if="course.status === 'rejected' && course.moderation_notes" class="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <span class="font-bold">Catatan Penolakan Tim Moderasi: </span>
                                    <span>{{ course.moderation_notes }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                        <NuxtLink
                            :to="`/learning/${course.slug}`"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300"
                            title="Buka Player Kelas & Lihat Sebagai Siswa"
                        >
                            <Play class="h-3.5 w-3.5 fill-current" />
                            <span>Lihat Sebagai Siswa</span>
                        </NuxtLink>

                        <Button as="Link" :href="`/instructor/courses/${course.id}/edit`" variant="primary" size="sm">
                            <Edit3 class="mr-1.5 h-3.5 w-3.5" />
                            <span>Studio & Silabus</span>
                        </Button>

                        <NuxtLink
                            v-if="course.status === 'published'"
                            :to="`/courses/${course.slug}`"
                            target="_blank"
                            class="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition dark:border-slate-800 dark:text-slate-300"
                            title="Lihat Halaman Publik"
                        >
                            <ExternalLink class="h-4 w-4" />
                        </NuxtLink>

                        <button
                            type="button"
                            @click="deleteCourse(course)"
                            class="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition dark:border-slate-800"
                            title="Hapus Kursus"
                        >
                            <Trash2 class="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <EmptyState
                v-else
                title="Belum Ada Kursus Dibuat"
                description="Mulai bagikan keahlian Anda dengan membuat kursus pertama hari ini."
                action-text="Buat Kursus Pertama"
                action-href="/instructor/courses/create"
            />
        </div>
    </div>
</template>
