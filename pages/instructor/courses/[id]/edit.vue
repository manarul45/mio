<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import Button from '~/components/UI/Button.vue';
import Input from '~/components/UI/Input.vue';
import Select from '~/components/UI/Select.vue';
import Textarea from '~/components/UI/Textarea.vue';
import Badge from '~/components/UI/Badge.vue';
import Modal from '~/components/UI/Modal.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import { useSwal } from '~/composables/useSwal';
import {
    ArrowLeft,
    Plus,
    Video,
    FileQuestion,
    Trash2,
    Edit2,
    BookOpen,
    Send,
    Play,
    UploadCloud,
    Loader2,
    Zap,
    Check,
    X,
    ChevronUp,
    ChevronDown,
    DollarSign,
    Sparkles,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const route = useRoute();
const courseId = route.params.id as string;
const { user, isAdmin } = useAuthProfile();
const supabase = useSupabaseClient();
const swal = useSwal();

const loading = ref(true);
const saving = ref(false);
const activeTab = ref('curriculum'); // 'curriculum' | 'basic' | 'pricing' | 'goals'

const course = ref<any>({
    id: courseId,
    title: '',
    subtitle: '',
    slug: '',
    description: '',
    category_id: '',
    level: 'beginner',
    language: 'id',
    price: 0,
    discount_price: null,
    thumbnail: '',
    preview_video_id: '',
    status: 'draft',
    learning_objectives: [''],
    requirements: [''],
    target_audience: [''],
    sections: [],
});

const categories = ref<any[]>([]);

// Section & Lesson Modals
const isSectionModalOpen = ref(false);
const sectionForm = ref({ id: null as string | null, title: '', description: '' });

const isLessonModalOpen = ref(false);
const activeSectionIdForLesson = ref<string | null>(null);
const lessonForm = ref({
    id: null as string | null,
    title: '',
    youtube_url: '',
    duration_minutes: 10,
    is_preview: false,
    description: '',
});

// Quiz Modal
const isQuizModalOpen = ref(false);
const activeSectionIdForQuiz = ref<string | null>(null);
const quizForm = ref({
    id: null as string | null,
    title: '',
    passing_score: 80,
    questions: [
        {
            question: '',
            explanation: '',
            options: [
                { option_text: '', is_correct: true },
                { option_text: '', is_correct: false },
            ]
        }
    ]
});

// Bulk JSON Import Modal
const isBulkModalOpen = ref(false);
const bulkJsonContent = ref('');
const isImportingBulk = ref(false);

const loadCourseDetails = async () => {
    loading.value = true;
    try {
        const { data: catData } = await supabase.from('categories').select('*').order('name');
        categories.value = catData || [];

        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                sections(
                    *,
                    lessons(*),
                    quizzes(
                        *,
                        quiz_questions(
                            *,
                            quiz_options(*)
                        )
                    )
                )
            `)
            .eq('id', courseId)
            .single();

        if (error) throw error;

        // Sort sections and their lessons
        const sortedSections = (data.sections || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        sortedSections.forEach((s: any) => {
            s.lessons = (s.lessons || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
            s.quizzes = (s.quizzes || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        });

        course.value = {
            ...data,
            learning_objectives: data.learning_objectives?.length ? data.learning_objectives : [''],
            requirements: data.requirements?.length ? data.requirements : [''],
            target_audience: data.target_audience?.length ? data.target_audience : [''],
            sections: sortedSections,
        };
    } catch (err: any) {
        console.error('Failed to load course:', err);
        swal.toastError(err.message || 'Gagal memuat kursus');
    } finally {
        loading.value = false;
    }
};

// Section Handlers
const openAddSection = () => {
    sectionForm.value = { id: null, title: '', description: '' };
    isSectionModalOpen.value = true;
};

const saveSection = async () => {
    if (!sectionForm.value.title.trim()) return;
    try {
        if (sectionForm.value.id) {
            await supabase
                .from('sections')
                .update({ title: sectionForm.value.title, description: sectionForm.value.description })
                .eq('id', sectionForm.value.id);
        } else {
            const nextOrder = course.value.sections.length + 1;
            await supabase
                .from('sections')
                .insert({
                    course_id: courseId,
                    title: sectionForm.value.title,
                    description: sectionForm.value.description,
                    sort_order: nextOrder,
                });
        }
        isSectionModalOpen.value = false;
        swal.toastSuccess('Modul berhasil disimpan!');
        loadCourseDetails();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menyimpan modul');
    }
};

const deleteSection = async (section: any) => {
    const ok = await swal.confirmDialog({
        title: 'Hapus Modul?',
        text: `Hapus modul "${section.title}" beserta seluruh pelajaran & kuisnya?`,
        confirmButtonColor: '#e11d48',
    });
    if (!ok) return;

    try {
        await supabase.from('sections').delete().eq('id', section.id);
        swal.toastSuccess('Modul berhasil dihapus');
        loadCourseDetails();
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

// Lesson Handlers
const openAddLesson = (sectionId: string) => {
    activeSectionIdForLesson.value = sectionId;
    lessonForm.value = { id: null, title: '', youtube_url: '', duration_minutes: 10, is_preview: false, description: '' };
    isLessonModalOpen.value = true;
};

const editLesson = (lesson: any, sectionId: string) => {
    activeSectionIdForLesson.value = sectionId;
    lessonForm.value = {
        id: lesson.id,
        title: lesson.title,
        youtube_url: lesson.youtube_url || (lesson.youtube_video_id ? `https://youtube.com/watch?v=${lesson.youtube_video_id}` : ''),
        duration_minutes: lesson.duration_minutes || 10,
        is_preview: !!lesson.is_preview,
        description: lesson.description || '',
    };
    isLessonModalOpen.value = true;
};

const extractYouTubeId = (url: string) => {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : url.trim();
};

const saveLesson = async () => {
    if (!lessonForm.value.title.trim() || !activeSectionIdForLesson.value) return;
    try {
        const videoId = extractYouTubeId(lessonForm.value.youtube_url);
        if (lessonForm.value.id) {
            await supabase
                .from('lessons')
                .update({
                    title: lessonForm.value.title,
                    youtube_video_id: videoId,
                    youtube_url: lessonForm.value.youtube_url,
                    duration_minutes: lessonForm.value.duration_minutes,
                    is_preview: lessonForm.value.is_preview,
                    description: lessonForm.value.description,
                })
                .eq('id', lessonForm.value.id);
        } else {
            const currentSection = course.value.sections.find((s: any) => s.id === activeSectionIdForLesson.value);
            const nextOrder = (currentSection?.lessons?.length || 0) + 1;
            await supabase
                .from('lessons')
                .insert({
                    section_id: activeSectionIdForLesson.value,
                    title: lessonForm.value.title,
                    youtube_video_id: videoId,
                    youtube_url: lessonForm.value.youtube_url,
                    duration_minutes: lessonForm.value.duration_minutes,
                    is_preview: lessonForm.value.is_preview,
                    description: lessonForm.value.description,
                    sort_order: nextOrder,
                });
        }
        isLessonModalOpen.value = false;
        swal.toastSuccess('Pelajaran video berhasil disimpan!');
        loadCourseDetails();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menyimpan pelajaran');
    }
};

const deleteLesson = async (lesson: any) => {
    const ok = await swal.confirmDialog({
        title: 'Hapus Pelajaran?',
        text: `Hapus video pelajaran "${lesson.title}"?`,
        confirmButtonColor: '#e11d48',
    });
    if (!ok) return;

    try {
        await supabase.from('lessons').delete().eq('id', lesson.id);
        swal.toastSuccess('Pelajaran berhasil dihapus');
        loadCourseDetails();
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

// Quiz Handlers
const openAddQuiz = (sectionId: string) => {
    activeSectionIdForQuiz.value = sectionId;
    quizForm.value = {
        id: null,
        title: '',
        passing_score: 80,
        questions: [
            {
                question: '',
                explanation: '',
                options: [
                    { option_text: '', is_correct: true },
                    { option_text: '', is_correct: false },
                ]
            }
        ]
    };
    isQuizModalOpen.value = true;
};

const addQuizQuestion = () => {
    quizForm.value.questions.push({
        question: '',
        explanation: '',
        options: [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: false },
        ]
    });
};

const removeQuizQuestion = (qIdx: number) => {
    quizForm.value.questions.splice(qIdx, 1);
};

const addQuizOption = (qIdx: number) => {
    quizForm.value.questions[qIdx].options.push({ option_text: '', is_correct: false });
};

const removeQuizOption = (qIdx: number, oIdx: number) => {
    quizForm.value.questions[qIdx].options.splice(oIdx, 1);
};

const setOptionCorrect = (qIdx: number, oIdx: number) => {
    quizForm.value.questions[qIdx].options.forEach((opt, idx) => {
        opt.is_correct = idx === oIdx;
    });
};

const saveQuiz = async () => {
    if (!quizForm.value.title.trim() || !activeSectionIdForQuiz.value) return;
    try {
        const currentSection = course.value.sections.find((s: any) => s.id === activeSectionIdForQuiz.value);
        const nextOrder = (currentSection?.quizzes?.length || 0) + 1;

        // Insert Quiz
        const { data: qData, error: qErr } = await supabase
            .from('quizzes')
            .insert({
                section_id: activeSectionIdForQuiz.value,
                title: quizForm.value.title,
                passing_score: quizForm.value.passing_score,
                sort_order: nextOrder,
            })
            .select()
            .single();

        if (qErr) throw qErr;

        // Insert Questions & Options
        for (let i = 0; i < quizForm.value.questions.length; i++) {
            const q = quizForm.value.questions[i];
            if (!q.question.trim()) continue;

            const { data: questData, error: questErr } = await supabase
                .from('quiz_questions')
                .insert({
                    quiz_id: qData.id,
                    question: q.question,
                    explanation: q.explanation,
                    sort_order: i + 1,
                })
                .select()
                .single();

            if (questErr) throw questErr;

            const optionsPayload = q.options.map((opt, optIdx) => ({
                question_id: questData.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
                sort_order: optIdx + 1,
            }));

            await supabase.from('quiz_options').insert(optionsPayload);
        }

        isQuizModalOpen.value = false;
        swal.toastSuccess('Kuis berhasil ditambahkan!');
        loadCourseDetails();
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menyimpan kuis');
    }
};

// Bulk JSON Import
const handleBulkJsonImport = async () => {
    if (!bulkJsonContent.value.trim()) return;
    isImportingBulk.value = true;
    try {
        const parsed = JSON.parse(bulkJsonContent.value);
        if (!Array.isArray(parsed)) throw new Error('Format JSON harus berupa array sections!');

        for (let sIdx = 0; sIdx < parsed.length; sIdx++) {
            const sec = parsed[sIdx];
            const { data: newSec, error: sErr } = await supabase
                .from('sections')
                .insert({
                    course_id: courseId,
                    title: sec.title || `Modul ${sIdx + 1}`,
                    description: sec.description || '',
                    sort_order: sec.section_order || sIdx + 1,
                })
                .select()
                .single();

            if (sErr) throw sErr;

            // Insert Lessons
            if (Array.isArray(sec.lessons)) {
                for (let lIdx = 0; lIdx < sec.lessons.length; lIdx++) {
                    const les = sec.lessons[lIdx];
                    const vId = extractYouTubeId(les.youtube_url || les.youtube_video_id);
                    await supabase
                        .from('lessons')
                        .insert({
                            section_id: newSec.id,
                            title: les.title || `Pelajaran ${lIdx + 1}`,
                            youtube_video_id: vId,
                            youtube_url: les.youtube_url,
                            duration_minutes: les.duration_minutes || 10,
                            is_preview: !!les.is_preview,
                            description: les.description || '',
                            sort_order: lIdx + 1,
                        });
                }
            }

            // Insert Quizzes
            if (Array.isArray(sec.quizzes)) {
                for (let qIdx = 0; qIdx < sec.quizzes.length; qIdx++) {
                    const qz = sec.quizzes[qIdx];
                    const { data: newQz } = await supabase
                        .from('quizzes')
                        .insert({
                            section_id: newSec.id,
                            title: qz.title || 'Kuis Evaluasi',
                            passing_score: qz.passing_score || 80,
                            sort_order: qIdx + 1,
                        })
                        .select()
                        .single();

                    if (newQz && Array.isArray(qz.questions)) {
                        for (let qnIdx = 0; qnIdx < qz.questions.length; qnIdx++) {
                            const qn = qz.questions[qnIdx];
                            const { data: newQn } = await supabase
                                .from('quiz_questions')
                                .insert({
                                    quiz_id: newQz.id,
                                    question: qn.question,
                                    explanation: qn.explanation || '',
                                    sort_order: qnIdx + 1,
                                })
                                .select()
                                .single();

                            if (newQn && Array.isArray(qn.options)) {
                                const opts = qn.options.map((opt: any, optIdx: number) => ({
                                    question_id: newQn.id,
                                    option_text: typeof opt === 'string' ? opt : opt.option_text,
                                    is_correct: typeof opt === 'object' ? !!opt.is_correct : optIdx === 0,
                                    sort_order: optIdx + 1,
                                }));
                                await supabase.from('quiz_options').insert(opts);
                            }
                        }
                    }
                }
            }
        }

        isBulkModalOpen.value = false;
        bulkJsonContent.value = '';
        swal.toastSuccess('Kurikulum berhasil diimpor secara otomatis!');
        loadCourseDetails();
    } catch (err: any) {
        swal.toastError(`JSON Error: ${err.message}`);
    } finally {
        isImportingBulk.value = false;
    }
};

// General Course Save & Moderation Submit
const saveCourseInfo = async () => {
    saving.value = true;
    try {
        const { error } = await supabase
            .from('courses')
            .update({
                title: course.value.title,
                subtitle: course.value.subtitle,
                description: course.value.description,
                category_id: course.value.category_id || null,
                level: course.value.level,
                language: course.value.language,
                price: Number(course.value.price) || 0,
                discount_price: course.value.discount_price ? Number(course.value.discount_price) : null,
                thumbnail: course.value.thumbnail,
                preview_video_id: course.value.preview_video_id,
                learning_objectives: course.value.learning_objectives.filter(Boolean),
                requirements: course.value.requirements.filter(Boolean),
                target_audience: course.value.target_audience.filter(Boolean),
            })
            .eq('id', courseId);

        if (error) throw error;
        swal.toastSuccess('Perubahan kursus berhasil disimpan!');
    } catch (err: any) {
        swal.toastError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
        saving.value = false;
    }
};

const submitForReview = async () => {
    const ok = await swal.confirmDialog({
        title: 'Ajukan Review Publikasi?',
        text: 'Kursus akan dikirimkan ke tim moderasi untuk diverifikasi sebelum diterbitkan ke publik.',
        confirmButtonText: 'Ya, Ajukan Review',
    });
    if (!ok) return;

    try {
        await supabase
            .from('courses')
            .update({ status: 'submitted' })
            .eq('id', courseId);

        course.value.status = 'submitted';
        swal.toastSuccess('Kursus berhasil diajukan untuk review!');
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

onMounted(() => {
    loadCourseDetails();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
                <NuxtLink
                    to="/instructor/courses"
                    class="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                    <ArrowLeft class="h-5 w-5" />
                </NuxtLink>
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="text-xl font-bold text-slate-900 dark:text-white truncate max-w-lg">
                            {{ course.title || 'Studio Kurikulum' }}
                        </h1>
                        <Badge
                            :variant="course.status === 'published' ? 'success' : (course.status === 'submitted' ? 'warning' : 'secondary')"
                            size="sm"
                        >
                            {{ course.status?.toUpperCase() }}
                        </Badge>
                    </div>
                    <p class="text-xs text-slate-500">Kelola bab silabus, video materi, kuis, dan informasi kursus.</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <NuxtLink
                    :to="`/learning/${course.slug}`"
                    target="_blank"
                    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <Play class="h-3.5 w-3.5 fill-current" />
                    <span>Preview Kelas</span>
                </NuxtLink>

                <Button
                    v-if="course.status !== 'published' && course.status !== 'submitted'"
                    variant="success"
                    size="sm"
                    @click="submitForReview"
                >
                    <Send class="mr-1.5 h-3.5 w-3.5" />
                    <span>Ajukan Publikasi</span>
                </Button>

                <Button variant="primary" size="sm" :loading="saving" @click="saveCourseInfo">
                    <span>Simpan</span>
                </Button>
            </div>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat data kurikulum..." />
        </div>

        <div v-else class="space-y-6">
            <!-- Studio Tabs Navigation -->
            <div class="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
                <button
                    type="button"
                    @click="activeTab = 'curriculum'"
                    :class="[
                        'pb-3 border-b-2 transition-colors flex items-center gap-2',
                        activeTab === 'curriculum'
                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white',
                    ]"
                >
                    <BookOpen class="h-4 w-4" />
                    <span>Kurikulum & Materi ({{ course.sections?.length || 0 }} Modul)</span>
                </button>

                <button
                    type="button"
                    @click="activeTab = 'basic'"
                    :class="[
                        'pb-3 border-b-2 transition-colors flex items-center gap-2',
                        activeTab === 'basic'
                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white',
                    ]"
                >
                    <Edit2 class="h-4 w-4" />
                    <span>Informasi Dasar</span>
                </button>

                <button
                    type="button"
                    @click="activeTab = 'pricing'"
                    :class="[
                        'pb-3 border-b-2 transition-colors flex items-center gap-2',
                        activeTab === 'pricing'
                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white',
                    ]"
                >
                    <DollarSign class="h-4 w-4" />
                    <span>Media & Harga</span>
                </button>

                <button
                    type="button"
                    @click="activeTab = 'goals'"
                    :class="[
                        'pb-3 border-b-2 transition-colors flex items-center gap-2',
                        activeTab === 'goals'
                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white',
                    ]"
                >
                    <Sparkles class="h-4 w-4" />
                    <span>Target Capaian Belajar</span>
                </button>
            </div>

            <!-- ============================================== -->
            <!-- TAB 1: CURRICULUM BUILDER                     -->
            <!-- ============================================== -->
            <div v-if="activeTab === 'curriculum'" class="space-y-6">
                <!-- Action Bar -->
                <div class="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Daftar Modul & Silabus</h3>
                        <p class="text-xs text-slate-500">Susun bab pembelajaran dan video YouTube secara terstruktur.</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <Button variant="secondary" size="sm" @click="isBulkModalOpen = true">
                            <Zap class="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                            <span>Impor JSON Massal</span>
                        </Button>

                        <Button variant="primary" size="sm" @click="openAddSection">
                            <Plus class="mr-1.5 h-3.5 w-3.5" />
                            <span>Tambah Modul / Bab</span>
                        </Button>
                    </div>
                </div>

                <!-- Sections List -->
                <div v-if="course.sections?.length > 0" class="space-y-4">
                    <div
                        v-for="(section, sIdx) in course.sections"
                        :key="section.id"
                        class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
                    >
                        <!-- Section Header -->
                        <div class="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <div>
                                <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Modul {{ sIdx + 1 }}
                                </span>
                                <h3 class="text-base font-bold text-slate-900 dark:text-white">
                                    {{ section.title }}
                                </h3>
                                <p v-if="section.description" class="text-xs text-slate-500 mt-0.5">
                                    {{ section.description }}
                                </p>
                            </div>

                            <div class="flex items-center gap-2">
                                <Button variant="secondary" size="sm" @click="openAddLesson(section.id)">
                                    <Video class="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
                                    <span>+ Video Materi</span>
                                </Button>

                                <Button variant="secondary" size="sm" @click="openAddQuiz(section.id)">
                                    <FileQuestion class="mr-1.5 h-3.5 w-3.5 text-purple-500" />
                                    <span>+ Kuis Evaluasi</span>
                                </Button>

                                <button
                                    type="button"
                                    @click="deleteSection(section)"
                                    class="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                    title="Hapus Modul"
                                >
                                    <Trash2 class="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <!-- Lessons & Quizzes within section -->
                        <div class="space-y-2 pl-2 sm:pl-4">
                            <!-- Lessons -->
                            <div
                                v-for="(lesson, lIdx) in section.lessons"
                                :key="lesson.id"
                                class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800 hover:border-slate-200 transition"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 shrink-0">
                                        <Video class="h-4 w-4" />
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2">
                                            <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {{ lIdx + 1 }}. {{ lesson.title }}
                                            </p>
                                            <Badge v-if="lesson.is_preview" variant="success" size="sm">
                                                Gratis Preview
                                            </Badge>
                                        </div>
                                        <p class="text-[11px] text-slate-400">
                                            {{ lesson.duration_minutes || 10 }} Menit • {{ lesson.youtube_video_id ? 'ID: ' + lesson.youtube_video_id : 'Link video disiapkan' }}
                                        </p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-1">
                                    <button
                                        type="button"
                                        @click="editLesson(lesson, section.id)"
                                        class="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700"
                                    >
                                        <Edit2 class="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        @click="deleteLesson(lesson)"
                                        class="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <!-- Quizzes -->
                            <div
                                v-for="quiz in section.quizzes"
                                :key="quiz.id"
                                class="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/40"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 shrink-0">
                                        <FileQuestion class="h-4 w-4" />
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            Kuis: {{ quiz.title }}
                                        </p>
                                        <p class="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                                            Passing Score: {{ quiz.passing_score }}%
                                        </p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-1">
                                    <span class="text-xs text-slate-400 pr-2">Tersimpan</span>
                                </div>
                            </div>

                            <p v-if="!section.lessons?.length && !section.quizzes?.length" class="text-xs text-slate-400 italic py-2">
                                Belum ada materi pada modul ini. Klik tombol di kanan atas untuk menambahkan video materi atau kuis.
                            </p>
                        </div>
                    </div>
                </div>

                <div v-else class="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 dark:bg-slate-900 dark:border-slate-800">
                    <BookOpen class="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Silabus Masih Kosong</h3>
                    <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                        Mulai rancang kurikulum kursus dengan menambahkan bab pertama atau gunakan fitur impor JSON massal.
                    </p>
                    <div class="flex items-center justify-center gap-3">
                        <Button variant="secondary" size="md" @click="isBulkModalOpen = true">
                            <Zap class="mr-1.5 h-4 w-4 text-amber-500" />
                            <span>Impor Format JSON</span>
                        </Button>
                        <Button variant="primary" size="md" @click="openAddSection">
                            <Plus class="mr-1.5 h-4 w-4" />
                            <span>Tambah Modul Pertama</span>
                        </Button>
                    </div>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 2: BASIC INFO                             -->
            <!-- ============================================== -->
            <div v-if="activeTab === 'basic'" class="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <div class="space-y-4 max-w-3xl">
                    <Input
                        v-model="course.title"
                        label="Judul Kursus *"
                        placeholder="Judul Kursus..."
                    />
                    <Input
                        v-model="course.subtitle"
                        label="Subjudul / Tagline Singkat"
                        placeholder="Tagline kursus..."
                    />

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="space-y-1">
                            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">Kategori</label>
                            <select
                                v-model="course.category_id"
                                class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            >
                                <option value="" disabled>-- Pilih Kategori --</option>
                                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                            </select>
                        </div>

                        <Select v-model="course.level" label="Tingkat Keahlian">
                            <option value="beginner">Pemula (Beginner)</option>
                            <option value="intermediate">Menengah (Intermediate)</option>
                            <option value="expert">Mahir (Expert)</option>
                            <option value="all_levels">Semua Tingkat</option>
                        </Select>

                        <Select v-model="course.language" label="Bahasa">
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                        </Select>
                    </div>

                    <Textarea
                        v-model="course.description"
                        label="Deskripsi Lengkap Kursus"
                        rows="5"
                    />

                    <Button variant="primary" size="md" :loading="saving" @click="saveCourseInfo">
                        Simpan Perubahan
                    </Button>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 3: PRICING & MEDIA                        -->
            <!-- ============================================== -->
            <div v-if="activeTab === 'pricing'" class="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <div class="space-y-4 max-w-3xl">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            v-model="course.price"
                            type="number"
                            label="Harga Normal (Rp)"
                        />
                        <Input
                            v-model="course.discount_price"
                            type="number"
                            label="Harga Diskon / Promo (Rp)"
                        />
                    </div>

                    <Input
                        v-model="course.thumbnail"
                        label="URL Gambar Thumbnail"
                        placeholder="https://..."
                    />

                    <Input
                        v-model="course.preview_video_id"
                        label="YouTube Video Trailer / Preview ID"
                        placeholder="Contoh: dQw4w9WgXcQ"
                    />

                    <Button variant="primary" size="md" :loading="saving" @click="saveCourseInfo">
                        Simpan Media & Harga
                    </Button>
                </div>
            </div>

            <!-- ============================================== -->
            <!-- TAB 4: GOALS                                  -->
            <!-- ============================================== -->
            <div v-if="activeTab === 'goals'" class="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <div class="space-y-4 max-w-3xl">
                    <label class="block text-sm font-bold text-slate-900 dark:text-white">
                        Target Capaian Belajar
                    </label>
                    <div v-for="(obj, idx) in course.learning_objectives" :key="idx" class="flex items-center gap-2">
                        <input
                            v-model="course.learning_objectives[idx]"
                            type="text"
                            class="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                        <button
                            type="button"
                            @click="course.learning_objectives.splice(idx, 1)"
                            class="p-2 text-slate-400 hover:text-rose-600"
                        >
                            <Trash2 class="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        type="button"
                        @click="course.learning_objectives.push('')"
                        class="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                    >
                        <Plus class="h-3.5 w-3.5" />
                        <span>Tambah Capaian Belajar</span>
                    </button>

                    <div class="pt-4">
                        <Button variant="primary" size="md" :loading="saving" @click="saveCourseInfo">
                            Simpan Target Belajar
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL: ADD/EDIT SECTION -->
        <Modal :show="isSectionModalOpen" title="Tambah / Edit Modul" @close="isSectionModalOpen = false">
            <div class="space-y-4">
                <Input
                    v-model="sectionForm.title"
                    label="Nama Modul / Bab *"
                    placeholder="Contoh: Modul 1: Pengenalan & Arsitektur"
                    required
                />
                <Textarea
                    v-model="sectionForm.description"
                    label="Deskripsi Singkat (Opsional)"
                    placeholder="Gambaran umum topik yang dibahas di modul ini..."
                    rows="3"
                />
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isSectionModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" @click="saveSection">Simpan Modul</Button>
            </template>
        </Modal>

        <!-- MODAL: ADD/EDIT LESSON -->
        <Modal :show="isLessonModalOpen" title="Pelajaran Video" @close="isLessonModalOpen = false">
            <div class="space-y-4">
                <Input
                    v-model="lessonForm.title"
                    label="Judul Video Pelajaran *"
                    placeholder="Contoh: 01. Persiapan Environment Nuxt & Supabase"
                    required
                />
                <Input
                    v-model="lessonForm.youtube_url"
                    label="Link Video YouTube / ID *"
                    placeholder="https://youtu.be/xxx atau dQw4w9WgXcQ"
                    required
                />
                <div class="grid grid-cols-2 gap-4">
                    <Input
                        v-model="lessonForm.duration_minutes"
                        type="number"
                        label="Estimasi Durasi (Menit)"
                    />
                    <div class="flex items-center gap-2 pt-6">
                        <input
                            type="checkbox"
                            id="is_preview_chk"
                            v-model="lessonForm.is_preview"
                            class="rounded text-indigo-600"
                        />
                        <label for="is_preview_chk" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Buka Preview Gratis
                        </label>
                    </div>
                </div>
                <Textarea
                    v-model="lessonForm.description"
                    label="Catatan & Rangkuman Pelajaran"
                    placeholder="Poin penting atau link referensi materi..."
                    rows="3"
                />
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isLessonModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" @click="saveLesson">Simpan Pelajaran</Button>
            </template>
        </Modal>

        <!-- MODAL: ADD QUIZ -->
        <Modal :show="isQuizModalOpen" max-width="xl" title="Kuis Evaluasi Modul" @close="isQuizModalOpen = false">
            <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        v-model="quizForm.title"
                        label="Judul Kuis *"
                        placeholder="Kuis Evaluasi Modul 1"
                        required
                    />
                    <Input
                        v-model="quizForm.passing_score"
                        type="number"
                        label="Nilai Minimum Kelulusan (%)"
                    />
                </div>

                <div class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Daftar Soal Pilihan Ganda ({{ quizForm.questions.length }})
                        </label>
                        <button
                            type="button"
                            @click="addQuizQuestion"
                            class="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                            <Plus class="h-3.5 w-3.5" />
                            <span>Tambah Soal</span>
                        </button>
                    </div>

                    <div
                        v-for="(q, qIdx) in quizForm.questions"
                        :key="qIdx"
                        class="p-4 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-800 space-y-3"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <span class="text-xs font-bold text-indigo-600 mt-2">Soal #{{ qIdx + 1 }}</span>
                            <input
                                v-model="q.question"
                                type="text"
                                placeholder="Tuliskan pertanyaan kuis..."
                                class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <button
                                v-if="quizForm.questions.length > 1"
                                type="button"
                                @click="removeQuizQuestion(qIdx)"
                                class="p-1.5 text-slate-400 hover:text-rose-600"
                            >
                                <Trash2 class="h-4 w-4" />
                            </button>
                        </div>

                        <!-- Options -->
                        <div class="space-y-2 pl-4">
                            <div v-for="(opt, oIdx) in q.options" :key="oIdx" class="flex items-center gap-2">
                                <input
                                    type="radio"
                                    :name="`correct_opt_${qIdx}`"
                                    :checked="opt.is_correct"
                                    @change="setOptionCorrect(qIdx, oIdx)"
                                    class="text-indigo-600"
                                    title="Tandai sebagai jawaban benar"
                                />
                                <input
                                    v-model="opt.option_text"
                                    type="text"
                                    :placeholder="`Pilihan Jawaban ${String.fromCharCode(65 + oIdx)}`"
                                    class="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                                <button
                                    v-if="q.options.length > 2"
                                    type="button"
                                    @click="removeQuizOption(qIdx, oIdx)"
                                    class="p-1 text-slate-400 hover:text-rose-600"
                                >
                                    <X class="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <button
                                type="button"
                                @click="addQuizOption(qIdx)"
                                class="text-[11px] font-semibold text-slate-500 hover:text-indigo-600"
                            >
                                + Tambah Pilihan Jawaban
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isQuizModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" @click="saveQuiz">Simpan Kuis</Button>
            </template>
        </Modal>

        <!-- MODAL: BULK JSON IMPORT -->
        <Modal :show="isBulkModalOpen" max-width="2xl" title="Impor Kurikulum Massal (Format JSON)" @close="isBulkModalOpen = false">
            <div class="space-y-3">
                <p class="text-xs text-slate-500">
                    Tempelkan skema silabus JSON untuk membuat seluruh modul, video YouTube, dan kuis secara otomatis dalam satu klik.
                </p>
                <textarea
                    v-model="bulkJsonContent"
                    rows="12"
                    placeholder='[
  {
    "section_order": 1,
    "title": "Modul 1: Pengenalan & Persiapan",
    "description": "Pengenalan materi kursus.",
    "lessons": [
      {
        "title": "Pelajaran 1: Pengenalan",
        "youtube_url": "https://youtu.be/vlBizSCJsWI",
        "duration_minutes": 10,
        "is_preview": true
      }
    ],
    "quizzes": [
      {
        "title": "Kuis Modul 1",
        "passing_score": 80,
        "questions": [
          {
            "question": "Apa itu Supabase?",
            "options": [
              { "option_text": "BaaS PostgreSQL Open-source", "is_correct": true },
              { "option_text": "Framework CSS", "is_correct": false }
            ]
          }
        ]
      }
    ]
  }
]'
                    class="font-mono text-xs w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 focus:border-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                ></textarea>
            </div>
            <template #footer>
                <Button variant="secondary" size="sm" @click="isBulkModalOpen = false">Batal</Button>
                <Button variant="primary" size="sm" :loading="isImportingBulk" @click="handleBulkJsonImport">
                    Eksekusi Impor Kurikulum
                </Button>
            </template>
        </Modal>
    </div>
</template>
