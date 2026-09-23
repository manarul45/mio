<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import EmptyState from '~/components/UI/EmptyState.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useSwal, Swal } from '~/composables/useSwal';
import {
    Video,
    FileQuestion,
    CheckCircle2,
    XCircle,
    Eye,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const courses = ref<any[]>([]);
const currentStatus = ref('submitted');

const loadModerationCourses = async () => {
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('courses')
            .select(`
                id,
                title,
                slug,
                thumbnail:thumbnail_url,
                status,
                moderation_notes,
                created_at,
                profiles:instructor_id(name),
                categories:category_id(name),
                sections:course_sections(
                    id,
                    lessons(id),
                    quizzes(id)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        courses.value = (data || []).map((c: any) => {
            let lessons = 0;
            let quizzes = 0;
            (c.sections || []).forEach((s: any) => {
                lessons += (s.lessons || []).length;
                quizzes += (s.quizzes || []).length;
            });
            return {
                id: c.id,
                title: c.title,
                slug: c.slug,
                thumbnail: c.thumbnail,
                status: c.status || 'draft',
                moderation_notes: c.moderation_notes,
                created_at: c.created_at,
                instructor: c.profiles,
                category: c.categories,
                lessons_count: lessons,
                quizzes_count: quizzes,
            };
        });
    } catch (err) {
        console.error('Failed to load moderation courses:', err);
    } finally {
        loading.value = false;
    }
};

const pendingCount = computed(() => {
    return courses.value.filter(c => c.status === 'submitted').length;
});

const filteredCourses = computed(() => {
    return courses.value.filter(c => c.status === currentStatus.value);
});

const approveCourse = async (course: any) => {
    const ok = await swal.confirmDialog({
        title: 'Publikasikan Kursus?',
        text: `Kursus "${course.title}" akan disetujui dan langsung tampil pada katalog publik untuk dibeli oleh siswa.`,
        confirmButtonText: 'Ya, Terbitkan Kursus',
        confirmButtonColor: '#059669',
    });

    if (!ok) return;

    try {
        const { error } = await supabase
            .from('courses')
            .update({ status: 'published', moderation_notes: null })
            .eq('id', course.id);

        if (error) throw error;
        swal.toastSuccess(`Kursus "${course.title}" berhasil dipublikasikan!`);
        loadModerationCourses();
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

const rejectCourse = async (course: any) => {
    const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Tolak Publikasi Kursus',
        input: 'textarea',
        inputLabel: 'Catatan Penolakan untuk Instruktur:',
        inputPlaceholder: 'Contoh: Kualitas audio kurang jernih pada bab 2, mohon perbaiki...',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Tolak Kursus',
        cancelButtonText: 'Batal',
        customClass: {
            popup: 'rounded-3xl shadow-2xl font-sans dark:bg-slate-900 dark:text-white',
            confirmButton: 'px-5 py-2.5 rounded-xl font-bold text-sm text-white',
            cancelButton: 'px-5 py-2.5 rounded-xl font-bold text-sm text-white',
        },
    });

    if (!isConfirmed) return;

    try {
        const { error } = await supabase
            .from('courses')
            .update({ status: 'rejected', moderation_notes: reason })
            .eq('id', course.id);

        if (error) throw error;
        swal.toastSuccess('Kursus telah ditolak dan catatan dikirimkan ke instruktur.');
        loadModerationCourses();
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'published':
            return { variant: 'success', text: 'Published' };
        case 'submitted':
            return { variant: 'warning', text: 'Menunggu Moderasi' };
        case 'rejected':
            return { variant: 'danger', text: 'Ditolak' };
        default:
            return { variant: 'secondary', text: 'Draft' };
    }
};

onMounted(() => {
    loadModerationCourses();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between w-full">
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                        Antrean Moderasi Kursus
                    </h1>
                    <Badge v-if="pendingCount > 0" variant="warning" size="sm">
                        {{ pendingCount }} Perlu Ditinjau
                    </Badge>
                </div>
                <p class="text-xs text-slate-500">Tinjau kelayakan konten video, silabus modul, dan kuis sebelum dipublikasikan ke katalog umum.</p>
            </div>
        </div>

        <div class="space-y-6">
            <!-- Filter Tabs Bar -->
            <div class="flex flex-wrap gap-2 items-center">
                <button
                    type="button"
                    @click="currentStatus = 'submitted'"
                    :class="[
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5',
                        currentStatus === 'submitted'
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                            : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300',
                    ]"
                >
                    <span>Menunggu Review</span>
                    <span v-if="pendingCount > 0" class="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                        {{ pendingCount }}
                    </span>
                </button>

                <button
                    type="button"
                    @click="currentStatus = 'published'"
                    :class="[
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition',
                        currentStatus === 'published'
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                            : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300',
                    ]"
                >
                    Disetujui (Published)
                </button>

                <button
                    type="button"
                    @click="currentStatus = 'rejected'"
                    :class="[
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition',
                        currentStatus === 'rejected'
                            ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                            : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300',
                    ]"
                >
                    Ditolak
                </button>
            </div>

            <div v-if="loading" class="py-12">
                <LoadingState text="Memuat antrean kursus..." />
            </div>

            <!-- Moderation List -->
            <div v-else class="space-y-4">
                <div
                    v-for="course in filteredCourses"
                    :key="course.id"
                    class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                    <div class="flex gap-4 items-start min-w-0">
                        <img
                            :src="course.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80'"
                            :alt="course.title"
                            class="h-20 w-32 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                        <div class="space-y-1 min-w-0">
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

                            <p class="text-xs text-slate-500">
                                Diajukan oleh: <span class="font-bold text-slate-700 dark:text-slate-300">{{ course.instructor?.name || 'Instruktur' }}</span>
                            </p>

                            <div class="flex items-center gap-3 text-xs text-slate-400 pt-1">
                                <span class="flex items-center gap-1">
                                    <Video class="h-3.5 w-3.5" />
                                    <span>{{ course.lessons_count }} Video</span>
                                </span>
                                <span>•</span>
                                <span class="flex items-center gap-1">
                                    <FileQuestion class="h-3.5 w-3.5" />
                                    <span>{{ course.quizzes_count }} Kuis</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
                        <NuxtLink
                            :to="`/learning/${course.slug}`"
                            target="_blank"
                            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition dark:border-slate-800 dark:text-slate-300"
                        >
                            <Eye class="h-3.5 w-3.5" />
                            <span>Preview Materi</span>
                        </NuxtLink>

                        <button
                            v-if="course.status === 'submitted' || course.status === 'rejected'"
                            type="button"
                            @click="approveCourse(course)"
                            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                        >
                            <CheckCircle2 class="h-3.5 w-3.5" />
                            <span>Setujui</span>
                        </button>

                        <button
                            v-if="course.status === 'submitted' || course.status === 'published'"
                            type="button"
                            @click="rejectCourse(course)"
                            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition"
                        >
                            <XCircle class="h-3.5 w-3.5" />
                            <span>Tolak</span>
                        </button>
                    </div>
                </div>

                <EmptyState
                    v-if="filteredCourses.length === 0"
                    title="Tidak Ada Kursus"
                    description="Tidak ada antrean kursus pada status ini."
                />
            </div>
        </div>
    </div>
</template>
