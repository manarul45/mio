<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import EmptyState from '~/components/UI/EmptyState.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import {
    BookOpen,
    Play,
    CheckCircle2,
    Video,
    FileQuestion,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user } = useAuthProfile();
const supabase = useSupabaseClient();

const loading = ref(true);
const enrollments = ref<any[]>([]);

const loadMyCourses = async () => {
    if (!user.value) return;
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('enrollments')
            .select(`
                id,
                progress_percentage,
                completed_at,
                courses:course_id(
                    id,
                    title,
                    slug,
                    thumbnail,
                    profiles:instructor_id(name),
                    categories:category_id(name),
                    sections(
                        id,
                        lessons(id),
                        quizzes(id)
                    )
                )
            `)
            .eq('user_id', user.value.id)
            .order('enrolled_at', { ascending: false });

        if (error) throw error;

        enrollments.value = (data || []).map((e: any) => {
            const course = e.courses || {};
            const sections = course.sections || [];
            let totalLessons = 0;
            let totalQuizzes = 0;
            sections.forEach((s: any) => {
                totalLessons += (s.lessons || []).length;
                totalQuizzes += (s.quizzes || []).length;
            });

            return {
                id: e.id,
                progress_percentage: e.progress_percentage || 0,
                completed_at: e.completed_at,
                course: {
                    id: course.id,
                    title: course.title,
                    slug: course.slug,
                    thumbnail: course.thumbnail,
                    instructor: course.profiles,
                    category: course.categories,
                },
                total_lessons_count: totalLessons,
                completed_lessons_count: Math.round((totalLessons * (e.progress_percentage || 0)) / 100),
                total_quizzes_count: totalQuizzes,
                passed_quizzes_count: e.progress_percentage === 100 ? totalQuizzes : 0,
            };
        });
    } catch (err) {
        console.error('Failed to load enrolled courses:', err);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadMyCourses();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <h1 class="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                Kursus Saya
            </h1>
            <p class="text-xs text-slate-500 hidden sm:block">Lanjutkan pembelajaran dan raih sertifikat kelulusan Anda.</p>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat daftar kursus Anda..." />
        </div>

        <div v-else class="space-y-6">
            <div v-if="enrollments.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    v-for="enrollment in enrollments"
                    :key="enrollment.id"
                    class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                >
                    <div>
                        <div class="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img
                                :src="enrollment.course.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80'"
                                :alt="enrollment.course.title"
                                class="h-full w-full object-cover"
                            />
                            <div class="absolute top-3 left-3">
                                <Badge v-if="enrollment.progress_percentage === 100" variant="success" size="sm">
                                    <CheckCircle2 class="mr-1 h-3 w-3" />
                                    <span>Selesai 100%</span>
                                </Badge>
                                <Badge v-else variant="primary" size="sm">
                                    {{ enrollment.progress_percentage }}% Selesai
                                </Badge>
                            </div>
                        </div>

                        <div class="p-5 space-y-3">
                            <div class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {{ enrollment.course.category?.name || 'General' }}
                            </div>

                            <h3 class="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                                {{ enrollment.course.title }}
                            </h3>

                            <p class="text-xs text-slate-500">
                                Instruktur: <span class="font-medium text-slate-700 dark:text-slate-300">{{ enrollment.course.instructor?.name || 'Instruktur MIO' }}</span>
                            </p>

                            <!-- Lesson & Quiz Stats Breakdown -->
                            <div class="grid grid-cols-2 gap-2 pt-1">
                                <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                    <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                                        <Video class="h-3.5 w-3.5" />
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-[10px] text-slate-400 font-medium">Pelajaran</p>
                                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {{ enrollment.completed_lessons_count }}/{{ enrollment.total_lessons_count }} Selesai
                                        </p>
                                    </div>
                                </div>

                                <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                    <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                                        <FileQuestion class="h-3.5 w-3.5" />
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-[10px] text-slate-400 font-medium">Kuis Evaluasi</p>
                                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {{ enrollment.passed_quizzes_count }}/{{ enrollment.total_quizzes_count }} Lulus
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <div class="space-y-1 pt-1">
                                <div class="flex justify-between text-[11px] font-semibold text-slate-500">
                                    <span>Total Progres Kelulusan</span>
                                    <span class="text-indigo-600 dark:text-indigo-400 font-bold">{{ enrollment.progress_percentage }}%</span>
                                </div>
                                <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        class="h-full rounded-full bg-indigo-600 transition-all duration-500"
                                        :style="{ width: `${enrollment.progress_percentage}%` }"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-5 pt-0 flex flex-col gap-2">
                        <Button
                            as="Link"
                            :href="`/learning/${enrollment.course.slug}`"
                            variant="primary"
                            size="md"
                            class="w-full justify-center"
                        >
                            <Play class="mr-1.5 h-4 w-4" />
                            <span>{{ enrollment.progress_percentage === 100 ? 'Review Kelas' : 'Lanjutkan Belajar' }}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <EmptyState
                v-else
                title="Anda Belum Memiliki Kursus"
                description="Temukan ribuan video tutorial dan tingkatkan skill Anda hari ini."
                action-text="Jelajahi Katalog Kursus"
                action-href="/courses"
            />
        </div>
    </div>
</template>
