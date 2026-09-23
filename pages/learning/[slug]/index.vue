<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import ToastContainer from '~/components/UI/ToastContainer.vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useToast } from '~/composables/useToast';
import {
    Play,
    CheckCircle2,
    Circle,
    FileQuestion,
    Video,
    Award,
    ChevronDown,
    Menu,
    X,
    ArrowLeft,
    Sparkles,
} from 'lucide-vue-next';

definePageMeta({
    layout: false, // Classroom has its own specialized fullscreen layout
});

const route = useRoute();
const slug = route.params.slug as string;
const { user } = useAuthProfile();
const supabase = useSupabaseClient();
const toast = useToast();

const loading = ref(true);
const course = ref<any>(null);
const activeLessonState = ref<any>(null);
const activeQuiz = ref<any>(null);
const completedLessonIds = ref<number[]>([]);
const passedQuizIds = ref<number[]>([]);
const isSidebarOpen = ref(true);
const isCertModalOpen = ref(false);
const activeLessonTab = ref('overview'); // 'overview' | 'qa'

// Quiz solver state
const selectedQuizAnswers = ref<Record<number, number>>({});
const quizResult = ref<any>(null);

const getSortedSectionItems = (section: any) => {
    const lessons = (section?.lessons || []).map((l: any) => ({ ...l, item_type: 'lesson' }));
    const quizzes = (section?.quizzes || []).map((q: any) => ({ ...q, item_type: 'quiz' }));
    return [...lessons, ...quizzes].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
};

const allCurriculumItems = computed(() => {
    if (!course.value?.sections) return [];
    return course.value.sections.flatMap((s: any) => getSortedSectionItems(s));
});

const totalItemsCount = computed(() => allCurriculumItems.value.length);

const progressPercentage = computed(() => {
    if (totalItemsCount.value === 0) return 0;
    const completed = completedLessonIds.value.length + passedQuizIds.value.length;
    return Math.min(100, Math.round((completed / totalItemsCount.value) * 100));
});

const isLessonCompleted = (lessonId: number) => {
    return completedLessonIds.value.includes(lessonId);
};

const isQuizPassed = (quizId: number) => {
    return passedQuizIds.value.includes(quizId);
};

const selectLesson = (lesson: any) => {
    activeQuiz.value = null;
    quizResult.value = null;
    activeLessonState.value = lesson;
};

const selectQuiz = (quiz: any) => {
    activeLessonState.value = null;
    activeQuiz.value = quiz;
    quizResult.value = null;
    selectedQuizAnswers.value = {};
};

const advanceToNextItem = () => {
    const all = allCurriculumItems.value;
    const currentId = activeLessonState.value ? activeLessonState.value.id : activeQuiz.value?.id;
    const currentType = activeLessonState.value ? 'lesson' : 'quiz';
    const currentIdx = all.findIndex((item: any) => item.id === currentId && item.item_type === currentType);

    if (currentIdx !== -1 && currentIdx < all.length - 1) {
        const nextItem = all[currentIdx + 1];
        if (nextItem.item_type === 'lesson') {
            selectLesson(nextItem);
        } else if (nextItem.item_type === 'quiz') {
            selectQuiz(nextItem);
        }
    }
};

const loadClassroomData = async () => {
    loading.value = true;
    try {
        const data = await $fetch<any>(`/api/learning/${slug}`);
        course.value = data;

        const sortedSections = data.sections || [];
        // Set default active item (lesson or quiz)
        if (sortedSections.length > 0) {
            const firstItems = getSortedSectionItems(sortedSections[0]);
            if (firstItems.length > 0) {
                if (firstItems[0].item_type === 'lesson') {
                    activeLessonState.value = firstItems[0];
                } else if (firstItems[0].item_type === 'quiz') {
                    activeQuiz.value = firstItems[0];
                }
            }
        }

        // Load user progress
        if (user.value) {
            const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('lesson_id')
                .eq('user_id', user.value.id)
                .eq('is_completed', true);

            if (progressData) {
                completedLessonIds.value = progressData.map((p: any) => p.lesson_id);
            }

            const { data: quizAttemptsData } = await supabase
                .from('quiz_attempts')
                .select('quiz_id')
                .eq('user_id', user.value.id)
                .eq('passed', true);

            if (quizAttemptsData) {
                passedQuizIds.value = quizAttemptsData.map((a: any) => a.quiz_id);
            }
        }
    } catch (err) {
        console.error('Failed to load classroom course:', err);
    } finally {
        loading.value = false;
    }
};

const markLessonComplete = async () => {
    if (!activeLessonState.value || !user.value) return;
    try {
        const lessonId = activeLessonState.value.id;
        await supabase
            .from('lesson_progress')
            .upsert({
                user_id: user.value.id,
                lesson_id: lessonId,
                is_completed: true,
                completed_at: new Date().toISOString(),
            }, { onConflict: 'user_id,lesson_id' });

        if (!completedLessonIds.value.includes(lessonId)) {
            completedLessonIds.value.push(lessonId);
        }

        // Update enrollment progress
        if (course.value) {
            await supabase
                .from('enrollments')
                .update({
                    progress_percentage: progressPercentage.value,
                    completed_at: progressPercentage.value === 100 ? new Date().toISOString() : null,
                })
                .eq('user_id', user.value.id)
                .eq('course_id', course.value.id);
        }

        toast.success('Pelajaran berhasil diselesaikan!');
        advanceToNextItem();
    } catch (err: any) {
        toast.error(err.message || 'Gagal menandai pelajaran');
    }
};

const submitQuiz = async () => {
    if (!activeQuiz.value) return;
    const questions = activeQuiz.value.quiz_questions || [];
    let correctCount = 0;

    questions.forEach((q: any) => {
        const selectedOptId = selectedQuizAnswers.value[q.id];
        const correctOpt = (q.quiz_options || []).find((o: any) => o.is_correct);
        if (correctOpt && correctOpt.id === selectedOptId) {
            correctCount++;
        }
    });

    const score = Math.round((correctCount / (questions.length || 1)) * 100);
    const passed = score >= (activeQuiz.value.passing_score || 80);

    quizResult.value = {
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
    };

    if (passed) {
        if (!passedQuizIds.value.includes(activeQuiz.value.id)) {
            passedQuizIds.value.push(activeQuiz.value.id);
        }
        if (user.value) {
            try {
                await supabase.from('quiz_attempts').insert({
                    user_id: user.value.id,
                    quiz_id: activeQuiz.value.id,
                    score_percentage: score,
                    passed: true,
                    completed_at: new Date().toISOString(),
                });
            } catch {}
        }

        // Update enrollment progress
        if (course.value && user.value) {
            try {
                await supabase
                    .from('enrollments')
                    .update({
                        progress_percentage: progressPercentage.value,
                        completed_at: progressPercentage.value === 100 ? new Date().toISOString() : null,
                    })
                    .eq('user_id', user.value.id)
                    .eq('course_id', course.value.id);
            } catch {}
        }

        toast.success(`Selamat! Anda lulus kuis dengan nilai ${score}%!`);
    } else {
        toast.warning(`Nilai Anda ${score}%. Batas kelulusan adalah ${activeQuiz.value.passing_score}%. Silakan ulangi lagi.`);
    }
};

onMounted(() => {
    loadClassroomData();
});
</script>

<template>
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
        <ToastContainer />

        <div v-if="loading" class="flex-1 flex items-center justify-center">
            <LoadingState text="Mempersiapkan ruang belajar kelas..." />
        </div>

        <template v-else-if="course">
            <!-- Classroom Top Navigation Bar -->
            <header class="h-16 border-b border-slate-800 bg-slate-900 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
                <div class="flex items-center gap-4 min-w-0">
                    <NuxtLink
                        to="/dashboard"
                        class="flex items-center gap-1.5 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                        title="Kembali ke Dashboard"
                    >
                        <ArrowLeft class="h-5 w-5" />
                    </NuxtLink>

                    <div class="min-w-0">
                        <p class="text-xs text-indigo-400 font-semibold truncate">{{ course.categories?.name || 'Kursus' }}</p>
                        <h1 class="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-xl">
                            {{ course.title }}
                        </h1>
                    </div>
                </div>

                <!-- Progress Meter & Certificate Trigger -->
                <div class="flex items-center gap-4 shrink-0">
                    <button
                        v-if="progressPercentage === 100"
                        type="button"
                        @click="isCertModalOpen = true"
                        class="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition animate-pulse"
                    >
                        <Award class="h-4 w-4 text-amber-400" />
                        <span class="hidden sm:inline">Klaim Sertifikat</span>
                    </button>

                    <!-- Progress Pill -->
                    <div class="flex items-center gap-3">
                        <div class="hidden sm:flex flex-col items-end">
                            <span class="text-xs font-bold text-white">{{ progressPercentage }}% Selesai</span>
                            <span class="text-[10px] text-slate-400">Progres Belajar</span>
                        </div>
                        <div class="h-2 w-20 sm:w-28 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                                :style="{ width: `${progressPercentage}%` }"
                            ></div>
                        </div>
                    </div>

                    <button
                        type="button"
                        @click="isSidebarOpen = !isSidebarOpen"
                        class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                    >
                        <Menu v-if="!isSidebarOpen" class="h-5 w-5" />
                        <X v-else class="h-5 w-5" />
                    </button>
                </div>
            </header>

            <!-- Main Classroom Layout: Player + Curriculum Sidebar -->
            <div class="flex-1 flex min-h-0 relative">
                <!-- Main Content Area: Video or Quiz -->
                <main class="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div class="max-w-5xl w-full mx-auto space-y-6">
                        <!-- VIDEO LESSON PLAYER -->
                        <template v-if="activeLessonState">
                            <!-- Responsive 16:9 Player -->
                            <div class="aspect-video w-full rounded-3xl bg-black overflow-hidden shadow-2xl border border-slate-800">
                                <iframe
                                    v-if="activeLessonState.youtube_video_id"
                                    :src="`https://www.youtube.com/embed/${activeLessonState.youtube_video_id}?rel=0&autoplay=1`"
                                    :title="activeLessonState.title"
                                    class="h-full w-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen
                                ></iframe>
                                <div v-else class="h-full w-full flex items-center justify-center text-xs text-slate-500">
                                    Video materi ini sedang dipersiapkan.
                                </div>
                            </div>

                            <!-- Lesson Action Toolbar -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
                                <div class="space-y-1">
                                    <div v-if="isLessonCompleted(activeLessonState.id)" class="flex items-center gap-2">
                                        <Badge variant="success" size="sm">
                                            ✓ Selesai Dipelajari
                                        </Badge>
                                    </div>
                                    <h2 class="text-lg font-bold text-white">
                                        {{ activeLessonState.title }}
                                    </h2>
                                </div>

                                <Button
                                    type="button"
                                    @click="markLessonComplete"
                                    variant="primary"
                                    size="md"
                                    class="shrink-0 shadow-lg shadow-indigo-500/20"
                                >
                                    <CheckCircle2 class="mr-2 h-4 w-4" />
                                    <span>{{ isLessonCompleted(activeLessonState.id) ? 'Lanjut ke Materi Berikutnya' : 'Tandai Selesai & Lanjut' }}</span>
                                </Button>
                            </div>

                            <!-- Lesson Notes & Summary -->
                            <div class="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                                <h3 class="text-sm font-bold text-white">Rangkuman Materi & Catatan Penting</h3>
                                <p class="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                                    {{ activeLessonState.description || 'Pahami materi video di atas dengan cermat dan ikuti instruksi yang disampaikan oleh instruktur.' }}
                                </p>
                            </div>
                        </template>

                        <!-- QUIZ SOLVER VIEW -->
                        <template v-else-if="activeQuiz">
                            <div class="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                                <div class="flex items-center justify-between border-b border-slate-800 pb-4">
                                    <div>
                                        <Badge variant="purple" size="sm">EVALUASI PEMAHAMAN</Badge>
                                        <h2 class="text-xl font-bold text-white mt-2">{{ activeQuiz.title }}</h2>
                                        <p class="text-xs text-slate-400">Jawab seluruh pertanyaan berikut untuk menguji pemahaman materi Anda.</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-xs text-slate-400 block">Passing Score:</span>
                                        <span class="text-lg font-black text-purple-400">{{ activeQuiz.passing_score }}%</span>
                                    </div>
                                </div>

                                <!-- Questions List -->
                                <!-- Questions List -->
                                <div v-if="activeQuiz.quiz_questions && activeQuiz.quiz_questions.length > 0" class="space-y-6">
                                    <div
                                        v-for="(q, qIdx) in activeQuiz.quiz_questions"
                                        :key="q.id"
                                        class="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3"
                                    >
                                        <p class="text-sm font-bold text-white">
                                            {{ qIdx + 1 }}. {{ q.question_text || q.question }}
                                        </p>

                                        <div v-if="q.quiz_options && q.quiz_options.length > 0" class="space-y-2 pl-4">
                                            <label
                                                v-for="opt in q.quiz_options"
                                                :key="opt.id"
                                                class="flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-700/50 cursor-pointer transition text-xs"
                                                :class="{ 'border-indigo-500 bg-indigo-950/40 text-indigo-200': selectedQuizAnswers[q.id] === opt.id }"
                                            >
                                                <input
                                                    type="radio"
                                                    :name="`question_${q.id}`"
                                                    :value="opt.id"
                                                    v-model="selectedQuizAnswers[q.id]"
                                                    class="text-indigo-600 focus:ring-0"
                                                />
                                                <span>{{ opt.option_text }}</span>
                                            </label>
                                        </div>
                                        <div v-else class="text-xs text-slate-500 italic pl-4">
                                            Pilihan jawaban sedang dipersiapkan.
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-sm">
                                    Belum ada butir pertanyaan pada kuis evaluasi ini.
                                </div>

                                <!-- Quiz Result -->
                                <div v-if="quizResult" class="p-6 rounded-2xl border text-center space-y-3" :class="quizResult.passed ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-rose-950/40 border-rose-800 text-rose-200'">
                                    <p class="text-base font-black">
                                        {{ quizResult.passed ? '🎉 Selamat! Anda Lulus Kuis' : '⚠️ Belum Memenuhi Passing Score' }}
                                    </p>
                                    <p class="text-sm">
                                        Nilai Anda: <strong>{{ quizResult.score }}%</strong> ({{ quizResult.correctCount }}/{{ quizResult.totalQuestions }} Soal Benar)
                                    </p>
                                    <div v-if="quizResult.passed" class="pt-2 flex justify-center">
                                        <Button
                                            type="button"
                                            variant="primary"
                                            size="md"
                                            @click="advanceToNextItem"
                                            class="shadow-lg shadow-indigo-500/20"
                                        >
                                            <span>Lanjut ke Materi Berikutnya &rarr;</span>
                                        </Button>
                                    </div>
                                </div>

                                <div v-if="activeQuiz.quiz_questions && activeQuiz.quiz_questions.length > 0 && !quizResult?.passed" class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                    <Button variant="primary" size="md" @click="submitQuiz">
                                        Kirimkan Jawaban Kuis
                                    </Button>
                                </div>
                            </div>
                        </template>
                    </div>
                </main>

                <!-- Curriculum Sidebar Navigation -->
                <aside
                    v-if="isSidebarOpen"
                    class="w-80 lg:w-96 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-y-auto"
                >
                    <div class="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                        <div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Daftar Materi & Silabus
                            </h3>
                            <span class="text-xs font-mono text-indigo-400 font-bold">
                                {{ completedLessonIds.length + passedQuizIds.length }}/{{ totalItemsCount }} Selesai
                            </span>
                        </div>
                        <button
                            type="button"
                            @click="isSidebarOpen = false"
                            class="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition lg:hidden"
                            title="Tutup Silabus"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-3 space-y-4">
                        <div v-for="(section, sIdx) in course.sections" :key="section.id" class="space-y-1">
                            <div class="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {{ section.title }}
                            </div>

                            <template v-for="item in getSortedSectionItems(section)" :key="item.item_type + '-' + item.id">
                                <!-- Lesson Item -->
                                <button
                                    v-if="item.item_type === 'lesson'"
                                    type="button"
                                    @click="selectLesson(item)"
                                    class="w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-3 text-xs"
                                    :class="[
                                        activeLessonState?.id === item.id
                                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                                            : 'hover:bg-slate-800 text-slate-300'
                                    ]"
                                >
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <CheckCircle2 v-if="isLessonCompleted(item.id)" class="h-4 w-4 text-emerald-400 shrink-0" />
                                        <Circle v-else class="h-4 w-4 text-slate-500 shrink-0" />
                                        <span class="truncate">{{ item.title }}</span>
                                    </div>
                                    <span class="text-[10px] opacity-75 shrink-0">{{ item.duration_minutes || 10 }}m</span>
                                </button>

                                <!-- Quiz Item -->
                                <button
                                    v-else-if="item.item_type === 'quiz'"
                                    type="button"
                                    @click="selectQuiz(item)"
                                    class="w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-3 text-xs border"
                                    :class="[
                                        activeQuiz?.id === item.id
                                            ? 'bg-purple-600 text-white font-bold shadow-md border-purple-500'
                                            : 'bg-purple-950/20 text-purple-300 border-purple-900/40 hover:bg-purple-900/30'
                                    ]"
                                >
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <FileQuestion class="h-4 w-4 shrink-0" :class="activeQuiz?.id === item.id ? 'text-white' : 'text-purple-400'" />
                                        <span class="truncate">Kuis: {{ item.title }}</span>
                                    </div>
                                    <Badge v-if="isQuizPassed(item.id)" variant="success" size="sm">
                                        ✓ Lulus
                                    </Badge>
                                    <span v-else class="text-[10px] opacity-75 shrink-0">{{ item.passing_score }}%</span>
                                </button>
                            </template>
                        </div>
                    </div>
                </aside>
            </div>
        </template>
    </div>
</template>
