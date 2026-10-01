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
    MessageSquare,
    Send,
    Check,
    Download,
    BookOpen,
    HelpCircle,
    Image as ImageIcon,
    Music,
    Lock,
} from 'lucide-vue-next';

definePageMeta({
    layout: false, // Classroom has its own specialized fullscreen layout
});

const route = useRoute();
const slug = route.params.slug as string;
const supabase = useSupabaseClient();
const toast = useToast();

const loading = ref(true);
const accessError = ref<{ status: number; message: string } | null>(null);
const course = ref<any>(null);
const activeLessonState = ref<any>(null);
const activeQuiz = ref<any>(null);
const completedLessonIds = ref<number[]>([]);
const passedQuizIds = ref<number[]>([]);
const isSidebarOpen = ref(true);
const isCertModalOpen = ref(false);
const activeLessonTab = ref('overview'); // 'overview' | 'qa'

// Discussions Q&A state
const discussions = ref<any[]>([]);
const loadingDiscussions = ref(false);
const newQuestionTitle = ref('');
const newQuestionContent = ref('');
const isSubmittingQuestion = ref(false);
const replyContent = ref<Record<number, string>>({});
const isSubmittingReply = ref<Record<number, boolean>>({});

// Quiz solver state
const selectedQuizAnswers = ref<Record<number, number>>({});
const quizResult = ref<any>(null);
const loadingQuizAttempt = ref(false);
const quizTopRef = ref<HTMLElement | null>(null);

const toQuizResult = (res: any) => ({
    score: res.score,
    passed: res.passed,
    correctCount: res.correct_count,
    totalQuestions: res.total_questions,
    passingScore: res.passing_score,
    review: Object.fromEntries((res.review || []).map((r: any) => [r.question_id, r])),
});

const getQuestionReview = (questionId: number) => quizResult.value?.review?.[questionId] || null;

const getOptionState = (questionId: number, optionId: number) => {
    const review = getQuestionReview(questionId);
    if (!review) return null;
    const isSelected = review.selected_option_id === optionId;
    if (isSelected) return review.is_correct ? 'selected-correct' : 'selected-wrong';
    if (review.correct_option_ids?.includes(optionId)) return 'answer-key';
    return null;
};

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

const loadDiscussions = async (lessonId: number) => {
    if (!lessonId) return;
    loadingDiscussions.value = true;
    try {
        const res: any = await $fetch(`/api/lessons/${lessonId}/discussions`);
        discussions.value = res.discussions || [];
    } catch (err) {
        console.error('Failed to load discussions:', err);
    } finally {
        loadingDiscussions.value = false;
    }
};

const submitQuestion = async () => {
    if (!newQuestionTitle.value.trim() || !newQuestionContent.value.trim() || !activeLessonState.value) return;
    isSubmittingQuestion.value = true;
    try {
        const res: any = await $fetch(`/api/lessons/${activeLessonState.value.id}/discussions`, {
            method: 'POST',
            body: {
                title: newQuestionTitle.value.trim(),
                content: newQuestionContent.value.trim(),
            },
        });
        if (res.discussion) {
            discussions.value.unshift(res.discussion);
        }
        newQuestionTitle.value = '';
        newQuestionContent.value = '';
        toast.success('Pertanyaan diskusi berhasil diajukan!');
    } catch (err: any) {
        toast.error(err.data?.statusMessage || err.message || 'Gagal mengirim pertanyaan diskusi.');
    } finally {
        isSubmittingQuestion.value = false;
    }
};

const submitReply = async (discId: number) => {
    const text = replyContent.value[discId];
    if (!text || !text.trim()) return;
    isSubmittingReply.value[discId] = true;
    try {
        const res: any = await $fetch(`/api/discussions/${discId}/reply`, {
            method: 'POST',
            body: { content: text.trim() },
        });
        const disc = discussions.value.find((d: any) => d.id === discId);
        if (disc) {
            if (!disc.replies) disc.replies = [];
            disc.replies.push(res.reply);
        }
        replyContent.value[discId] = '';
        toast.success('Tanggapan Anda berhasil dikirim!');
    } catch (err: any) {
        toast.error(err.data?.statusMessage || err.message || 'Gagal mengirim balasan.');
    } finally {
        isSubmittingReply.value[discId] = false;
    }
};

const toggleResolve = async (disc: any) => {
    try {
        const res: any = await $fetch(`/api/discussions/${disc.id}/resolve`, { method: 'POST' });
        disc.is_resolved = res.is_resolved;
        toast.info(disc.is_resolved ? 'Diskusi ditandai selesai.' : 'Diskusi dibuka kembali.');
    } catch (err: any) {
        toast.error('Gagal memperbarui status diskusi.');
    }
};

const selectLesson = (lesson: any) => {
    if (lesson.is_locked) {
        toast.info(lesson.lock_reason || 'Materi ini belum terbuka.');
        return;
    }
    activeQuiz.value = null;
    quizResult.value = null;
    activeLessonState.value = lesson;
    activeLessonTab.value = 'overview';
    loadDiscussions(lesson.id);
};

const selectQuiz = async (quiz: any) => {
    if (quiz.is_locked) {
        toast.info(quiz.lock_reason || 'Latihan ini belum terbuka.');
        return;
    }
    activeLessonState.value = null;
    activeQuiz.value = quiz;
    quizResult.value = null;
    selectedQuizAnswers.value = {};

    if (!course.value?.viewer?.is_enrolled) return;

    loadingQuizAttempt.value = true;
    try {
        const res: any = await $fetch('/api/learning/quiz-attempt', {
            headers: await authHeaders(),
            query: { course_id: course.value.id, quiz_id: quiz.id },
        });
        if (activeQuiz.value?.id !== quiz.id || !res.attempt) return;

        selectedQuizAnswers.value = Object.fromEntries(
            Object.entries(res.attempt.answers || {}).map(([qid, optId]) => [Number(qid), Number(optId)]),
        );
        quizResult.value = toQuizResult(res.attempt);
    } catch (err) {
        console.error('Failed to load last quiz attempt:', err);
    } finally {
        loadingQuizAttempt.value = false;
    }
};

const retakeQuiz = () => {
    quizResult.value = null;
    selectedQuizAnswers.value = {};
    quizTopRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

const openItem = (item: any) => {
    if (item.item_type === 'lesson') selectLesson(item);
    else selectQuiz(item);
};

const authHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchCourse = async () => {
    const data = await $fetch<any>(`/api/learning/${slug}`, { headers: await authHeaders() });
    course.value = data;
    completedLessonIds.value = data.viewer?.completed_lesson_ids || [];
    passedQuizIds.value = data.viewer?.passed_quiz_ids || [];
    return data;
};

/** Ambil ulang isi kursus setelah progres berubah, supaya materi yang baru terbuka ikut dimuat. */
const refreshCourse = async () => {
    try {
        await fetchCourse();
    } catch (err) {
        console.error('Failed to refresh classroom course:', err);
    }
};

const loadClassroomData = async () => {
    loading.value = true;
    accessError.value = null;
    try {
        await fetchCourse();

        // Lanjutkan dari materi pertama yang belum selesai dan sudah terbuka.
        const items = allCurriculumItems.value.filter((item: any) => !item.is_locked);
        const isDone = (item: any) => item.item_type === 'lesson' ? isLessonCompleted(item.id) : isQuizPassed(item.id);
        const startItem = items.find((item: any) => !isDone(item)) || items[0];
        if (startItem) openItem(startItem);
    } catch (err: any) {
        const status = err?.statusCode || err?.response?.status || 500;
        if (status === 401) {
            return navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`);
        }
        accessError.value = {
            status,
            message: err?.data?.statusMessage || 'Ruang belajar gagal dimuat. Silakan coba lagi.',
        };
        console.error('Failed to load classroom course:', err);
    } finally {
        loading.value = false;
    }
};

const markLessonComplete = async () => {
    if (!activeLessonState.value || !course.value) return;
    const lessonId = activeLessonState.value.id;

    if (!course.value.viewer?.is_enrolled) {
        if (!completedLessonIds.value.includes(lessonId)) completedLessonIds.value.push(lessonId);
        toast.info('Mode pratinjau: progres tidak disimpan.');
        advanceToNextItem();
        return;
    }

    try {
        const res: any = await $fetch('/api/learning/complete-lesson', {
            method: 'POST',
            headers: await authHeaders(),
            body: { course_id: course.value.id, lesson_id: lessonId },
        });

        if (!completedLessonIds.value.includes(lessonId)) {
            completedLessonIds.value.push(lessonId);
        }

        toast.success(res.message || 'Pelajaran berhasil diselesaikan!');
        await refreshCourse();
        advanceToNextItem();
    } catch (err: any) {
        toast.error(err?.data?.statusMessage || err.message || 'Gagal menandai pelajaran');
    }
};

const submitQuiz = async () => {
    if (!activeQuiz.value || !course.value) return;

    if (!course.value.viewer?.is_enrolled) {
        toast.info('Mode pratinjau: kuis hanya dinilai untuk peserta terdaftar.');
        return;
    }

    try {
        const res: any = await $fetch('/api/learning/submit-quiz', {
            method: 'POST',
            headers: await authHeaders(),
            body: {
                course_id: course.value.id,
                quiz_id: activeQuiz.value.id,
                answers: selectedQuizAnswers.value,
            },
        });

        quizResult.value = toQuizResult(res);
        quizTopRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (res.passed) {
            if (!passedQuizIds.value.includes(activeQuiz.value.id)) {
                passedQuizIds.value.push(activeQuiz.value.id);
            }
            toast.success(`Selamat! Anda lulus kuis dengan nilai ${res.score}%!`);
            await refreshCourse();
        } else {
            toast.warning(`Nilai Anda ${res.score}%. Batas kelulusan adalah ${res.passing_score}%. Silakan ulangi lagi.`);
        }
    } catch (err: any) {
        toast.error(err?.data?.statusMessage || err.message || 'Gagal mengirim jawaban kuis');
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

                            <!-- Lesson Content Tabs (Overview & Q&A) -->
                            <div class="space-y-4">
                                <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
                                    <button
                                        type="button"
                                        @click="activeLessonTab = 'overview'"
                                        :class="[
                                            'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2',
                                            activeLessonTab === 'overview'
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        ]"
                                    >
                                        <Video class="h-4 w-4" />
                                        <span>Ikhtisar & Catatan</span>
                                    </button>
                                    <button
                                        type="button"
                                        @click="activeLessonTab = 'qa'"
                                        :class="[
                                            'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2',
                                            activeLessonTab === 'qa'
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        ]"
                                    >
                                        <MessageSquare class="h-4 w-4" />
                                        <span>Forum Tanya-Jawab</span>
                                        <span v-if="discussions.length > 0" class="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                                            {{ discussions.length }}
                                        </span>
                                    </button>
                                </div>

                                <!-- OVERVIEW TAB -->
                                <div v-show="activeLessonTab === 'overview'" class="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                                    <h3 class="text-sm font-bold text-white">Rangkuman Materi & Catatan Penting</h3>
                                    <p class="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                                        {{ activeLessonState.description || 'Pahami materi video di atas dengan cermat dan ikuti instruksi yang disampaikan oleh instruktur.' }}
                                    </p>
                                </div>

                                <!-- Q&A DISCUSSION TAB -->
                                <div v-show="activeLessonTab === 'qa'" class="space-y-6">
                                    <!-- Ask Question Box -->
                                    <div class="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                                        <h3 class="text-sm font-bold text-white flex items-center gap-2">
                                            <HelpCircle class="h-4 w-4 text-indigo-400" />
                                            <span>Ajukan Pertanyaan Diskusi</span>
                                        </h3>
                                        <div class="space-y-3">
                                            <input
                                                v-model="newQuestionTitle"
                                                type="text"
                                                placeholder="Judul singkat pertanyaan (contoh: Bingung di menit 04:15)..."
                                                class="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs text-white focus:border-indigo-500 focus:outline-none"
                                            />
                                            <textarea
                                                v-model="newQuestionContent"
                                                rows="3"
                                                placeholder="Jelaskan pertanyaan atau kendala Anda secara detail..."
                                                class="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs text-white focus:border-indigo-500 focus:outline-none"
                                            ></textarea>
                                            <div class="flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    size="sm"
                                                    :disabled="isSubmittingQuestion || !newQuestionTitle.trim() || !newQuestionContent.trim()"
                                                    @click="submitQuestion"
                                                >
                                                    <Send class="h-3.5 w-3.5 mr-1.5" />
                                                    <span>{{ isSubmittingQuestion ? 'Mengirim...' : 'Kirim Pertanyaan' }}</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Discussions List -->
                                    <div v-if="loadingDiscussions" class="py-8 text-center text-xs text-slate-500">
                                        <LoadingState text="Memuat forum diskusi materi..." />
                                    </div>

                                    <div v-else-if="discussions.length === 0" class="p-8 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-xs text-slate-500">
                                        Belum ada diskusi untuk materi ini. Jadilah yang pertama bertanya!
                                    </div>

                                    <div v-else class="space-y-4">
                                        <div
                                            v-for="disc in discussions"
                                            :key="disc.id"
                                            class="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"
                                        >
                                            <div class="flex items-start justify-between gap-4">
                                                <div class="flex items-center gap-3">
                                                    <div class="h-9 w-9 rounded-xl bg-indigo-950 flex items-center justify-center font-bold text-xs text-indigo-400 border border-indigo-800">
                                                        {{ disc.user?.name ? disc.user.name[0].toUpperCase() : 'U' }}
                                                    </div>
                                                    <div>
                                                        <p class="text-xs font-bold text-white flex items-center gap-2">
                                                            <span>{{ disc.user?.name || 'Siswa' }}</span>
                                                            <Badge v-if="disc.user?.role === 'INSTRUCTOR' || disc.user?.role === 'ADMIN'" variant="purple" size="sm">Instruktur</Badge>
                                                        </p>
                                                        <p class="text-[10px] text-slate-500">{{ new Date(disc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</p>
                                                    </div>
                                                </div>

                                                <div class="flex items-center gap-2">
                                                    <span v-if="disc.is_resolved" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                                                        <Check class="h-3 w-3" />
                                                        <span>Terselesaikan</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        @click="toggleResolve(disc)"
                                                        class="text-[11px] font-semibold text-slate-400 hover:text-indigo-400 transition"
                                                        title="Ubah status terselesaikan"
                                                    >
                                                        {{ disc.is_resolved ? 'Buka Kembali' : 'Tandai Selesai' }}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 class="text-sm font-bold text-white">{{ disc.title }}</h4>
                                                <p class="text-xs text-slate-300 mt-1 whitespace-pre-line leading-relaxed">{{ disc.content }}</p>
                                            </div>

                                            <!-- Replies -->
                                            <div v-if="disc.replies && disc.replies.length > 0" class="pl-4 sm:pl-6 border-l-2 border-indigo-900/60 space-y-3 pt-2">
                                                <div
                                                    v-for="rep in disc.replies"
                                                    :key="rep.id"
                                                    class="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2"
                                                >
                                                    <div class="flex items-center justify-between">
                                                        <div class="flex items-center gap-2">
                                                            <span class="font-bold text-xs text-white">{{ rep.user?.name || 'User' }}</span>
                                                            <Badge v-if="rep.is_instructor || rep.user?.role === 'INSTRUCTOR' || rep.user?.role === 'ADMIN'" variant="primary" size="sm">Instruktur</Badge>
                                                        </div>
                                                        <span class="text-[10px] text-slate-500">{{ new Date(rep.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</span>
                                                    </div>
                                                    <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{{ rep.content }}</p>
                                                </div>
                                            </div>

                                            <!-- Reply Form -->
                                            <div class="pt-2 flex items-center gap-2">
                                                <input
                                                    v-model="replyContent[disc.id]"
                                                    type="text"
                                                    placeholder="Tulis tanggapan atau jawaban..."
                                                    @keyup.enter="submitReply(disc.id)"
                                                    class="flex-1 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-xs text-white focus:border-indigo-500 focus:outline-none"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    size="sm"
                                                    :disabled="isSubmittingReply[disc.id] || !replyContent[disc.id]?.trim()"
                                                    @click="submitReply(disc.id)"
                                                >
                                                    <Send class="h-3 w-3 mr-1" />
                                                    <span>Balas</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <!-- QUIZ SOLVER VIEW -->
                        <template v-else-if="activeQuiz">
                            <div ref="quizTopRef" class="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 scroll-mt-4">
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

                                <div v-if="loadingQuizAttempt" class="text-xs text-slate-400">Memuat jawaban terakhir Anda...</div>

                                <!-- Quiz Result Summary -->
                                <div v-if="quizResult" class="p-6 rounded-2xl border text-center space-y-3" :class="quizResult.passed ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-rose-950/40 border-rose-800 text-rose-200'">
                                    <p class="text-base font-black">
                                        {{ quizResult.passed ? '🎉 Selamat! Anda Lulus Kuis' : '⚠️ Belum Memenuhi Passing Score' }}
                                    </p>
                                    <p class="text-3xl font-black">{{ quizResult.score }}</p>
                                    <p class="text-sm">
                                        {{ quizResult.correctCount }} dari {{ quizResult.totalQuestions }} soal benar
                                        <span class="opacity-75">(batas lulus {{ quizResult.passingScore }})</span>
                                    </p>
                                    <p v-if="!quizResult.passed" class="text-xs opacity-80">
                                        Soal yang salah ditandai merah. Kunci jawaban ditampilkan setelah Anda lulus.
                                    </p>
                                    <div class="pt-2 flex justify-center">
                                        <Button v-if="quizResult.passed" type="button" variant="primary" size="md" @click="advanceToNextItem" class="shadow-lg shadow-indigo-500/20">
                                            <span>Lanjut ke Materi Berikutnya &rarr;</span>
                                        </Button>
                                        <Button v-else type="button" variant="primary" size="md" @click="retakeQuiz">
                                            <span>Ulangi Kuis</span>
                                        </Button>
                                    </div>
                                </div>

                                <!-- Questions List -->
                                <div v-if="activeQuiz.quiz_questions && activeQuiz.quiz_questions.length > 0" class="space-y-6">
                                    <div
                                        v-for="(q, qIdx) in activeQuiz.quiz_questions"
                                        :key="q.id"
                                        class="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3"
                                    >
                                        <!-- Question Text & Multimedia Attachment -->
                                        <div class="space-y-3">
                                            <div class="flex items-start justify-between gap-3">
                                                <p class="text-sm font-bold text-white">
                                                    {{ qIdx + 1 }}. {{ q.question_text || q.question }}
                                                </p>
                                                <Badge v-if="getQuestionReview(q.id)" :variant="getQuestionReview(q.id).is_correct ? 'success' : 'danger'" size="sm" class="shrink-0">
                                                    {{ getQuestionReview(q.id).is_correct ? '✓ Benar' : '✗ Salah' }}
                                                </Badge>
                                            </div>

                                            <!-- Multimedia rendering (Image / Audio / Video) -->
                                            <div v-if="q.media_url" class="rounded-2xl overflow-hidden max-w-lg border border-slate-700 bg-black/40 p-2">
                                                <img
                                                    v-if="q.media_type === 'image' || (!q.media_type && (q.media_url.endsWith('.jpg') || q.media_url.endsWith('.png') || q.media_url.endsWith('.webp') || q.media_url.endsWith('.gif')))"
                                                    :src="q.media_url"
                                                    alt="Media Soal"
                                                    class="rounded-xl max-h-64 object-contain mx-auto"
                                                />
                                                <audio
                                                    v-else-if="q.media_type === 'audio' || (!q.media_type && (q.media_url.endsWith('.mp3') || q.media_url.endsWith('.wav') || q.media_url.endsWith('.ogg')))"
                                                    controls
                                                    class="w-full"
                                                    :src="q.media_url"
                                                ></audio>
                                                <div v-else class="text-xs text-slate-400">
                                                    <a :href="q.media_url" target="_blank" class="text-indigo-400 hover:underline">Buka Lampiran Media &rarr;</a>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Options list -->
                                        <div v-if="q.quiz_options && q.quiz_options.length > 0" class="space-y-2 pl-4">
                                            <label
                                                v-for="opt in q.quiz_options"
                                                :key="opt.id"
                                                class="flex items-center gap-3 p-3 rounded-xl border transition text-xs"
                                                :class="[
                                                    quizResult ? 'cursor-default' : 'cursor-pointer hover:bg-slate-700/50',
                                                    getOptionState(q.id, opt.id) === 'selected-correct' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                                                        : getOptionState(q.id, opt.id) === 'selected-wrong' ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                                                        : getOptionState(q.id, opt.id) === 'answer-key' ? 'border-emerald-700 border-dashed text-emerald-300'
                                                        : selectedQuizAnswers[q.id] === opt.id ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                                                        : 'border-slate-700',
                                                ]"
                                            >
                                                <input
                                                    type="radio"
                                                    :name="`question_${q.id}`"
                                                    :value="opt.id"
                                                    v-model="selectedQuizAnswers[q.id]"
                                                    :disabled="!!quizResult"
                                                    class="text-indigo-600 focus:ring-0"
                                                />
                                                <img v-if="opt.media_url" :src="opt.media_url" alt="" class="h-10 w-10 object-cover rounded-lg border border-slate-600" />
                                                <span class="flex-1">{{ opt.option_text }}</span>
                                                <span v-if="getOptionState(q.id, opt.id) === 'selected-correct'" class="text-[10px] font-bold">Jawaban Anda ✓</span>
                                                <span v-else-if="getOptionState(q.id, opt.id) === 'selected-wrong'" class="text-[10px] font-bold">Jawaban Anda ✗</span>
                                                <span v-else-if="getOptionState(q.id, opt.id) === 'answer-key'" class="text-[10px] font-bold">Kunci Jawaban</span>
                                            </label>
                                        </div>
                                        <div v-else class="text-xs text-slate-500 italic pl-4">
                                            Pilihan jawaban sedang dipersiapkan.
                                        </div>

                                        <!-- Question Explanation (shown after quiz submission) -->
                                        <div v-if="quizResult && q.explanation" class="p-3 bg-indigo-950/40 border border-indigo-800 rounded-xl text-xs text-indigo-300">
                                            <strong class="text-indigo-200">Penjelasan:</strong> {{ q.explanation }}
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-sm">
                                    Belum ada butir pertanyaan pada kuis evaluasi ini.
                                </div>

                                <div v-if="activeQuiz.quiz_questions && activeQuiz.quiz_questions.length > 0" class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                                    <Button v-if="!quizResult" variant="primary" size="md" @click="submitQuiz">
                                        Kirimkan Jawaban Kuis
                                    </Button>
                                    <Button v-else-if="quizResult.passed" variant="primary" size="md" @click="advanceToNextItem">
                                        Lanjut ke Materi Berikutnya &rarr;
                                    </Button>
                                    <Button v-else variant="primary" size="md" @click="retakeQuiz">
                                        Ulangi Kuis
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

                            <a
                                v-if="section.kitab_url"
                                :href="section.kitab_url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="w-full text-left p-2.5 rounded-xl transition flex items-center gap-2.5 text-xs hover:bg-slate-800 text-emerald-300"
                            >
                                <Download class="h-4 w-4 shrink-0" />
                                <span class="truncate">Download Kitab</span>
                            </a>
                            <a
                                v-if="section.ebook_url"
                                :href="section.ebook_url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="w-full text-left p-2.5 rounded-xl transition flex items-center gap-2.5 text-xs hover:bg-slate-800 text-emerald-300"
                            >
                                <BookOpen class="h-4 w-4 shrink-0" />
                                <span class="truncate">Ebook dan Diktat Materi</span>
                            </a>
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
                                            : item.is_locked
                                                ? 'text-slate-500 opacity-60 cursor-not-allowed'
                                                : 'hover:bg-slate-800 text-slate-300'
                                    ]"
                                    :title="item.is_locked ? item.lock_reason : undefined"
                                >
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <Lock v-if="item.is_locked" class="h-4 w-4 text-slate-500 shrink-0" />
                                        <CheckCircle2 v-else-if="isLessonCompleted(item.id)" class="h-4 w-4 text-emerald-400 shrink-0" />
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
                                            : item.is_locked
                                                ? 'bg-purple-950/10 text-slate-500 border-purple-900/20 opacity-60 cursor-not-allowed'
                                                : 'bg-purple-950/20 text-purple-300 border-purple-900/40 hover:bg-purple-900/30'
                                    ]"
                                    :title="item.is_locked ? item.lock_reason : undefined"
                                >
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <Lock v-if="item.is_locked" class="h-4 w-4 text-slate-500 shrink-0" />
                                        <FileQuestion v-else class="h-4 w-4 shrink-0" :class="activeQuiz?.id === item.id ? 'text-white' : 'text-purple-400'" />
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

        <div v-else class="flex-1 flex items-center justify-center p-6">
            <div class="max-w-md w-full text-center space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-8">
                <BookOpen class="h-10 w-10 mx-auto text-indigo-400" />
                <h1 class="text-lg font-bold text-white">
                    {{ accessError?.status === 403 ? 'Akses Ruang Belajar Terkunci' : 'Ruang Belajar Tidak Tersedia' }}
                </h1>
                <p class="text-sm text-slate-400">{{ accessError?.message || 'Kursus tidak ditemukan.' }}</p>
                <div class="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <NuxtLink
                        :to="`/courses/${slug}`"
                        class="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                    >
                        Lihat Detail Kursus
                    </NuxtLink>
                    <NuxtLink
                        to="/my-courses"
                        class="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                    >
                        Kursus Saya
                    </NuxtLink>
                </div>
            </div>
        </div>
    </div>
</template>
