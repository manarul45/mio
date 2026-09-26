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
    GripVertical,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
    middleware: ['auth'],
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
const isUploadingThumbnail = ref(false);

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

        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const currentUserId = user.value?.id || (user.value as any)?.sub || sessionUser?.id;
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const data: any = await $fetch(`/api/instructor/courses/${courseId}`, {
            headers,
            query: currentUserId ? { user_id: currentUserId } : undefined
        });
        const sortedSections = data.sections || [];

        course.value = {
            ...data,
            thumbnail: data.thumbnail_url || data.thumbnail || '',
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

const openEditSection = (section: any) => {
    sectionForm.value = { id: section.id, title: section.title, description: section.description || '' };
    isSectionModalOpen.value = true;
};

const saveSection = async () => {
    if (!sectionForm.value.title.trim()) return;
    try {
        if (sectionForm.value.id) {
            await supabase
                .from('course_sections')
                .update({ title: sectionForm.value.title, description: sectionForm.value.description })
                .eq('id', sectionForm.value.id);
        } else {
            const nextOrder = (course.value.sections?.length || 0) + 1;
            await supabase
                .from('course_sections')
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
        await supabase.from('course_sections').delete().eq('id', section.id);
        swal.toastSuccess('Modul berhasil dihapus');
        loadCourseDetails();
    } catch (err: any) {
        swal.toastError(err.message);
    }
};

// REORDER & DRAG-AND-DROP HANDLERS (SECTIONS & UNIFIED SECTION ITEMS)
const getSectionItems = (section: any) => {
    const lessons = (section.lessons || []).map((l: any) => ({ ...l, item_type: 'lesson' }));
    const quizzes = (section.quizzes || []).map((q: any) => ({ ...q, item_type: 'quiz' }));
    return [...lessons, ...quizzes].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
};

// Drag and drop state for items (lessons & quizzes)
const draggedItem = ref<any>(null);
const dragOverSectionId = ref<string | number | null>(null);
const dragOverItemIndex = ref<number | null>(null);

const onDragStartItem = (event: DragEvent, section: any, item: any, index: number) => {
    draggedItem.value = { sectionId: section.id, item, index };
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try {
            event.dataTransfer.setData('text/plain', JSON.stringify({ sectionId: section.id, itemId: item.id, itemType: item.item_type, index }));
        } catch {}
    }
};

const onDragOverItem = (event: DragEvent, section: any, index: number) => {
    if (!draggedItem.value) return;
    if (draggedItem.value.sectionId !== section.id) return;
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
    dragOverSectionId.value = section.id;
    dragOverItemIndex.value = index;
};

const onDragLeaveItem = (section: any, index: number) => {
    if (dragOverSectionId.value === section.id && dragOverItemIndex.value === index) {
        dragOverItemIndex.value = null;
    }
};

const onDropItem = async (event: DragEvent, section: any, targetIndex: number) => {
    event.preventDefault();
    if (!draggedItem.value) return;
    if (draggedItem.value.sectionId !== section.id) {
        draggedItem.value = null;
        dragOverItemIndex.value = null;
        dragOverSectionId.value = null;
        return;
    }

    const sourceIndex = draggedItem.value.index;
    draggedItem.value = null;
    dragOverItemIndex.value = null;
    dragOverSectionId.value = null;

    if (sourceIndex === targetIndex) return;

    const items = getSectionItems(section);
    const originalLessons = section.lessons ? [...section.lessons] : [];
    const originalQuizzes = section.quizzes ? [...section.quizzes] : [];

    const [movedItem] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, movedItem);

    items.forEach((item: any, idx: number) => {
        const newSort = idx + 1;
        if (item.item_type === 'lesson') {
            const l = (section.lessons || []).find((les: any) => les.id === item.id);
            if (l) l.sort_order = newSort;
        } else if (item.item_type === 'quiz') {
            const q = (section.quizzes || []).find((qz: any) => qz.id === item.id);
            if (q) q.sort_order = newSort;
        }
    });

    const payloadItems = items.map((it: any) => ({
        id: it.id,
        type: it.item_type,
    }));

    try {
        await $fetch(`/api/instructor/sections/${section.id}/items/reorder`, {
            method: 'POST',
            body: { items: payloadItems },
        });
        swal.toastSuccess('Urutan materi berhasil diperbarui');
    } catch (err: any) {
        section.lessons = originalLessons;
        section.quizzes = originalQuizzes;
        swal.toastError('Gagal memperbarui urutan materi');
    }
};

const onDragEndItem = () => {
    draggedItem.value = null;
    dragOverItemIndex.value = null;
    dragOverSectionId.value = null;
};

// Drag and drop state for sections (modules)
const draggedSection = ref<any>(null);
const dragOverSectionIndex = ref<number | null>(null);

const onDragStartSection = (event: DragEvent, section: any, index: number) => {
    draggedSection.value = { section, index };
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
    }
};

const onDragOverSection = (event: DragEvent, index: number) => {
    if (!draggedSection.value) return;
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
    dragOverSectionIndex.value = index;
};

const onDragLeaveSection = (index: number) => {
    if (dragOverSectionIndex.value === index) {
        dragOverSectionIndex.value = null;
    }
};

const onDropSection = async (event: DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (!draggedSection.value) return;

    const sourceIndex = draggedSection.value.index;
    draggedSection.value = null;
    dragOverSectionIndex.value = null;

    if (sourceIndex === targetIndex || !course.value.sections) return;

    const sections = [...course.value.sections];
    const originalSections = [...course.value.sections];

    const [movedSection] = sections.splice(sourceIndex, 1);
    sections.splice(targetIndex, 0, movedSection);
    course.value.sections = sections;

    const sectionIds = sections.map((s: any) => s.id);
    try {
        await $fetch(`/api/instructor/courses/${courseId}/sections/reorder`, {
            method: 'POST',
            body: { section_ids: sectionIds },
        });
        swal.toastSuccess('Urutan modul berhasil diperbarui');
    } catch (err: any) {
        course.value.sections = originalSections;
        swal.toastError('Gagal memperbarui urutan modul');
    }
};

const onDragEndSection = () => {
    draggedSection.value = null;
    dragOverSectionIndex.value = null;
};

const moveSection = async (index: number, direction: 'up' | 'down') => {
    if (!course.value.sections) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= course.value.sections.length) return;

    const sections = [...course.value.sections];
    const originalSections = [...course.value.sections];

    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;
    course.value.sections = sections;

    const sectionIds = sections.map((s: any) => s.id);
    try {
        await $fetch(`/api/instructor/courses/${courseId}/sections/reorder`, {
            method: 'POST',
            body: { section_ids: sectionIds },
        });
        swal.toastSuccess('Urutan modul berhasil diperbarui');
    } catch (err: any) {
        course.value.sections = originalSections;
        swal.toastError('Gagal memperbarui urutan modul');
    }
};

const moveSectionItem = async (section: any, index: number, direction: 'up' | 'down') => {
    const items = getSectionItems(section);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const originalLessons = section.lessons ? [...section.lessons] : [];
    const originalQuizzes = section.quizzes ? [...section.quizzes] : [];

    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    items.forEach((item: any, idx: number) => {
        const newSort = idx + 1;
        if (item.item_type === 'lesson') {
            const l = (section.lessons || []).find((les: any) => les.id === item.id);
            if (l) l.sort_order = newSort;
        } else if (item.item_type === 'quiz') {
            const q = (section.quizzes || []).find((qz: any) => qz.id === item.id);
            if (q) q.sort_order = newSort;
        }
    });

    const payloadItems = items.map((it: any) => ({
        id: it.id,
        type: it.item_type,
    }));

    try {
        await $fetch(`/api/instructor/sections/${section.id}/items/reorder`, {
            method: 'POST',
            body: { items: payloadItems },
        });
        swal.toastSuccess('Urutan materi berhasil diperbarui');
    } catch (err: any) {
        section.lessons = originalLessons;
        section.quizzes = originalQuizzes;
        swal.toastError('Gagal memperbarui urutan materi');
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
        duration_minutes: lesson.duration_seconds
    ? Math.max(1, Math.round(Number(lesson.duration_seconds) / 60))
    : (lesson.duration_minutes || 10),
        is_preview: !!lesson.is_preview,
        description: lesson.description || '',
    };
    isLessonModalOpen.value = true;
};

const slugify = (value: string) => {
    const base = (value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return `${base || 'materi'}-${suffix}`;
};

const extractYouTubeId = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match) return match[1];
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
    return '';
};

const lessonPayload = (title: string, youtubeUrl: string, durationMinutes: number, isPreview: boolean, description: string) => {
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
        throw new Error(`Link YouTube untuk "${title}" tidak dikenali. Tempel tautan YouTube atau ID 11 karakter.`);
    }
    const minutes = Number(durationMinutes) || 0;
    return {
        title: title.trim(),
        youtube_video_id: videoId,
        duration_seconds: Math.max(0, Math.round(minutes * 60)),
        is_preview: !!isPreview,
        description: description || '',
    };
};

const saveLesson = async () => {
    if (!lessonForm.value.title.trim() || !activeSectionIdForLesson.value) return;
    try {
        const payload = lessonPayload(
            lessonForm.value.title,
            lessonForm.value.youtube_url,
            lessonForm.value.duration_minutes,
            lessonForm.value.is_preview,
            lessonForm.value.description,
        );
        if (lessonForm.value.id) {
            const { error } = await supabase
                .from('lessons')
                .update(payload)
                .eq('id', lessonForm.value.id);
            if (error) throw error;
        } else {
            const currentSection = course.value.sections.find((s: any) => s.id === activeSectionIdForLesson.value);
            const nextOrder = (currentSection?.lessons?.length || 0) + 1;
            const { error } = await supabase
                .from('lessons')
                .insert({
                    ...payload,
                    section_id: activeSectionIdForLesson.value,
                    slug: slugify(lessonForm.value.title),
                    sort_order: nextOrder,
                });
            if (error) throw error;
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
                id: null,
                question: '',
                explanation: '',
                options: [
                    { id: null, option_text: '', is_correct: true },
                    { id: null, option_text: '', is_correct: false },
                ]
            }
        ]
    };
    isQuizModalOpen.value = true;
};

const editQuiz = (quiz: any, sectionId: string) => {
    activeSectionIdForQuiz.value = sectionId;
    quizForm.value = {
        id: quiz.id,
        title: quiz.title,
        passing_score: quiz.passing_score || 80,
        questions: (quiz.quiz_questions && quiz.quiz_questions.length > 0)
            ? quiz.quiz_questions.map((q: any) => ({
                id: q.id,
                question: q.question_text || q.question || '',
                explanation: q.explanation || '',
                options: (q.quiz_options && q.quiz_options.length > 0)
                    ? q.quiz_options.map((opt: any) => ({
                        id: opt.id,
                        option_text: opt.option_text || '',
                        is_correct: !!opt.is_correct
                    }))
                    : [
                        { id: null, option_text: '', is_correct: true },
                        { id: null, option_text: '', is_correct: false },
                    ]
            }))
            : [
                {
                    id: null,
                    question: '',
                    explanation: '',
                    options: [
                        { id: null, option_text: '', is_correct: true },
                        { id: null, option_text: '', is_correct: false },
                    ]
                }
            ]
    };
    isQuizModalOpen.value = true;
};

const deleteQuiz = async (quiz: any) => {
    const confirmed = await swal.confirmDialog({
        title: 'Hapus Kuis?',
        text: `Apakah Anda yakin ingin menghapus kuis "${quiz.title}" beserta seluruh soalnya?`,
        confirmButtonText: 'Ya, Hapus Kuis',
        confirmButtonColor: '#e11d48',
    });

    if (confirmed) {
        try {
            await supabase.from('quizzes').delete().eq('id', quiz.id);
            swal.toastSuccess('Kuis berhasil dihapus!');
            loadCourseDetails();
        } catch (err: any) {
            swal.toastError(err.message || 'Gagal menghapus kuis');
        }
    }
};

const addQuizQuestion = () => {
    quizForm.value.questions.push({
        id: null,
        question: '',
        explanation: '',
        options: [
            { id: null, option_text: '', is_correct: true },
            { id: null, option_text: '', is_correct: false },
        ]
    });
};

const removeQuizQuestion = (qIdx: number) => {
    quizForm.value.questions.splice(qIdx, 1);
};

const addQuizOption = (qIdx: number) => {
    quizForm.value.questions[qIdx].options.push({ id: null, option_text: '', is_correct: false });
};

const removeQuizOption = (qIdx: number, oIdx: number) => {
    quizForm.value.questions[qIdx].options.splice(oIdx, 1);
};

const setOptionCorrect = (qIdx: number, oIdx: number) => {
    quizForm.value.questions[qIdx].options.forEach((opt: any, idx: number) => {
        opt.is_correct = idx === oIdx;
    });
};

const saveQuiz = async () => {
    if (!quizForm.value.title.trim() || !activeSectionIdForQuiz.value) return;
    try {
        let quizId = quizForm.value.id;

        if (quizId) {
            // Update existing quiz
            const { error: uErr } = await supabase
                .from('quizzes')
                .update({
                    title: quizForm.value.title,
                    passing_score: quizForm.value.passing_score,
                })
                .eq('id', quizId);

            if (uErr) throw uErr;

            // Delete old questions to re-insert cleanly
            await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
        } else {
            // Insert new quiz
            const currentSection = course.value.sections.find((s: any) => s.id === activeSectionIdForQuiz.value);
            const nextOrder = (currentSection?.quizzes?.length || 0) + 1;

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
            quizId = qData.id;
        }

        // Insert Questions & Options
        for (let i = 0; i < quizForm.value.questions.length; i++) {
            const q = quizForm.value.questions[i];
            if (!q.question.trim()) continue;

            const { data: questData, error: questErr } = await supabase
                .from('quiz_questions')
                .insert({
                    quiz_id: quizId,
                    question_text: q.question,
                    explanation: q.explanation || null,
                    sort_order: i + 1,
                })
                .select()
                .single();

            if (questErr) throw questErr;

            const optionsPayload = q.options.map((opt: any, optIdx: number) => ({
                question_id: questData.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
                sort_order: optIdx + 1,
            }));

            await supabase.from('quiz_options').insert(optionsPayload);
        }

        isQuizModalOpen.value = false;
        swal.toastSuccess(quizForm.value.id ? 'Kuis berhasil diperbarui!' : 'Kuis berhasil ditambahkan!');
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
            const sectionTitle = sec.title || `Modul ${sIdx + 1}`;
            const { data: newSec, error: sErr } = await supabase
                .from('course_sections')
                .insert({
                    course_id: courseId,
                    title: sectionTitle,
                    description: sec.description || '',
                    sort_order: sec.section_order || sec.sort_order || sIdx + 1,
                })
                .select()
                .single();

            if (sErr) throw sErr;

            if (Array.isArray(sec.lessons)) {
                for (let lIdx = 0; lIdx < sec.lessons.length; lIdx++) {
                    const les = sec.lessons[lIdx];
                    const lessonTitle = les.title || `Pelajaran ${lIdx + 1}`;
                    const payload = lessonPayload(
                        lessonTitle,
                        les.youtube_url || les.youtube_video_id || '',
                        les.duration_minutes || 10,
                        les.is_preview,
                        les.description || '',
                    );
                    const { error: lessonErr } = await supabase
                        .from('lessons')
                        .insert({
                            ...payload,
                            section_id: newSec.id,
                            slug: slugify(lessonTitle),
                            sort_order: lIdx + 1,
                        });
                    if (lessonErr) throw lessonErr;
                }
            }

            if (Array.isArray(sec.quizzes)) {
                for (let qIdx = 0; qIdx < sec.quizzes.length; qIdx++) {
                    const qz = sec.quizzes[qIdx];
                    const quizTitle = qz.title || 'Kuis Evaluasi';
                    const { data: newQz, error: quizErr } = await supabase
                        .from('quizzes')
                        .insert({
                            section_id: newSec.id,
                            title: quizTitle,
                            slug: slugify(quizTitle),
                            passing_score: qz.passing_score || 80,
                            sort_order: qIdx + 1,
                        })
                        .select()
                        .single();

                    if (quizErr) throw quizErr;

                    if (newQz && Array.isArray(qz.questions)) {
                        for (let qnIdx = 0; qnIdx < qz.questions.length; qnIdx++) {
                            const qn = qz.questions[qnIdx];
                            const { data: newQn, error: questionErr } = await supabase
                                .from('quiz_questions')
                                .insert({
                                    quiz_id: newQz.id,
                                    question_text: qn.question || qn.question_text || '',
                                    explanation: qn.explanation || '',
                                    sort_order: qnIdx + 1,
                                })
                                .select()
                                .single();
                            if (questionErr) throw questionErr;

                            if (newQn && Array.isArray(qn.options)) {
                                const opts = qn.options.map((opt: any, optIdx: number) => ({
                                    question_id: newQn.id,
                                    option_text: typeof opt === 'string' ? opt : opt.option_text,
                                    is_correct: typeof opt === 'object' ? !!opt.is_correct : optIdx === 0,
                                    sort_order: optIdx + 1,
                                }));
                                const { error: optionErr } = await supabase.from('quiz_options').insert(opts);
                                if (optionErr) throw optionErr;
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
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const currentUserId = user.value?.id || (user.value as any)?.sub || sessionUser?.id;
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        await $fetch(`/api/instructor/courses/${courseId}`, {
            method: 'PATCH',
            headers,
            body: {
                instructor_id: currentUserId,
                title: course.value.title,
                subtitle: course.value.subtitle,
                description: course.value.description,
                category_id: course.value.category_id || null,
                level: course.value.level,
                language: course.value.language,
                price: Number(course.value.price) || 0,
                discount_price: course.value.discount_price ? Number(course.value.discount_price) : null,
                thumbnail_url: course.value.thumbnail || null,
                preview_video_id: course.value.preview_video_id,
                learning_objectives: course.value.learning_objectives?.filter(Boolean),
                requirements: course.value.requirements?.filter(Boolean),
                target_audience: course.value.target_audience?.filter(Boolean),
            }
        });

        swal.toastSuccess('Perubahan kursus berhasil disimpan!');
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message || 'Gagal menyimpan perubahan.');
    } finally {
        saving.value = false;
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
            course.value.thumbnail = res.url;
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

const submitForReview = async () => {
    const ok = await swal.confirmDialog({
        title: 'Ajukan Review Publikasi?',
        text: 'Kursus akan dikirimkan ke tim moderasi untuk diverifikasi sebelum diterbitkan ke publik.',
        confirmButtonText: 'Ya, Ajukan Review',
    });
    if (!ok) return;

    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const currentUserId = user.value?.id || (user.value as any)?.sub || sessionUser?.id;
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        await $fetch(`/api/instructor/courses/${courseId}`, {
            method: 'PATCH',
            headers,
            body: {
                instructor_id: currentUserId,
                status: 'submitted'
            }
        });

        course.value.status = 'submitted';
        swal.toastSuccess('Kursus berhasil diajukan untuk review!');
    } catch (err: any) {
        swal.toastError(err.data?.statusMessage || err.message);
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
                        :class="[
                            'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 transition-all',
                            dragOverSectionIndex === sIdx && draggedSection?.index !== sIdx ? 'ring-2 ring-indigo-500 ring-offset-4 bg-indigo-50/30 dark:bg-indigo-950/30' : '',
                            draggedSection?.section?.id === section.id ? 'opacity-50 border-dashed border-indigo-400' : ''
                        ]"
                        @dragover="onDragOverSection($event, sIdx)"
                        @dragleave="onDragLeaveSection(sIdx)"
                        @drop="onDropSection($event, sIdx)"
                    >
                        <!-- Section Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div
                                    draggable="true"
                                    @dragstart="onDragStartSection($event, section, sIdx)"
                                    @dragend="onDragEndSection"
                                    class="cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 p-1 -ml-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                                    title="Tahan dan geser (drag & drop) untuk memindahkan posisi modul"
                                >
                                    <GripVertical class="h-4 w-4" />
                                </div>
                                <div class="min-w-0">
                                    <span class="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Modul {{ sIdx + 1 }}</span>
                                    <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">
                                        {{ section.title }}
                                    </h3>
                                    <p v-if="section.description" class="text-xs text-slate-500 mt-0.5">
                                        {{ section.description }}
                                    </p>
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <div class="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
                                    <button
                                        type="button"
                                        @click="moveSection(sIdx, 'up')"
                                        :disabled="sIdx === 0"
                                        class="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                        title="Pindahkan Modul Ke Atas"
                                    >
                                        <ChevronUp class="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        @click="moveSection(sIdx, 'down')"
                                        :disabled="sIdx === course.sections.length - 1"
                                        class="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                        title="Pindahkan Modul Ke Bawah"
                                    >
                                        <ChevronDown class="h-4 w-4" />
                                    </button>
                                </div>

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
                                    @click="openEditSection(section)"
                                    class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 transition"
                                    title="Edit Modul"
                                >
                                    <Edit2 class="h-4 w-4" />
                                </button>

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

                        <!-- Unified Lessons and Quizzes in Section -->
                        <div class="space-y-2">
                            <template v-for="(item, itemIdx) in getSectionItems(section)" :key="item.item_type + '-' + item.id">
                                <!-- Video Lesson Item -->
                                <div
                                    v-if="item.item_type === 'lesson'"
                                    draggable="true"
                                    @dragstart="onDragStartItem($event, section, item, itemIdx)"
                                    @dragend="onDragEndItem"
                                    @dragover="onDragOverItem($event, section, itemIdx)"
                                    @dragleave="onDragLeaveItem(section, itemIdx)"
                                    @drop="onDropItem($event, section, itemIdx)"
                                    :class="[
                                        'flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 hover:border-slate-200 transition-all group',
                                        dragOverSectionId === section.id && dragOverItemIndex === itemIdx && draggedItem?.index !== itemIdx ? 'ring-2 ring-indigo-500 ring-offset-2 scale-[1.01] bg-indigo-50/80 dark:bg-indigo-950/50 shadow-md' : '',
                                        draggedItem?.item?.id === item.id && draggedItem?.item?.item_type === 'lesson' ? 'opacity-40 border-dashed border-indigo-400' : ''
                                    ]"
                                >
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <!-- Drag Handle -->
                                        <div
                                            class="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 p-1 -ml-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition shrink-0"
                                            title="Tahan dan geser (drag & drop) untuk memindahkan urutan video"
                                        >
                                            <GripVertical class="h-4 w-4" />
                                        </div>

                                        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                                            <Video class="h-4 w-4" />
                                        </div>
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-2">
                                                <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                    {{ item.title }}
                                                </p>
                                                <Badge v-if="item.is_preview" variant="success" size="sm">
                                                    Gratis Preview
                                                </Badge>
                                            </div>
                                            <p class="text-[11px] text-slate-400">
                                                {{ item.duration_seconds ? Math.max(1, Math.round(Number(item.duration_seconds) / 60)) : (item.duration_minutes || 10) }} Menit • {{ item.youtube_video_id ? 'ID: ' + item.youtube_video_id : 'Link video disiapkan' }} Menit • {{ item.youtube_video_id ? 'ID: ' + item.youtube_video_id : 'Link video disiapkan' }}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1 shrink-0">
                                        <div class="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-1">
                                            <button
                                                type="button"
                                                @click="moveSectionItem(section, itemIdx, 'up')"
                                                :disabled="itemIdx === 0"
                                                class="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                                                title="Pindahkan Materi Ke Atas"
                                            >
                                                <ChevronUp class="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                @click="moveSectionItem(section, itemIdx, 'down')"
                                                :disabled="itemIdx === getSectionItems(section).length - 1"
                                                class="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                                                title="Pindahkan Materi Ke Bawah"
                                            >
                                                <ChevronDown class="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            @click="editLesson(item, section.id)"
                                            class="p-1.5 text-slate-400 hover:text-indigo-600 transition rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                            title="Edit Pelajaran"
                                        >
                                            <Edit2 class="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            @click="deleteLesson(item)"
                                            class="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                            title="Hapus Pelajaran"
                                        >
                                            <Trash2 class="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <!-- Quiz Item -->
                                <div
                                    v-else-if="item.item_type === 'quiz'"
                                    draggable="true"
                                    @dragstart="onDragStartItem($event, section, item, itemIdx)"
                                    @dragend="onDragEndItem"
                                    @dragover="onDragOverItem($event, section, itemIdx)"
                                    @dragleave="onDragLeaveItem(section, itemIdx)"
                                    @drop="onDropItem($event, section, itemIdx)"
                                    :class="[
                                        'flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/40 transition-all group',
                                        dragOverSectionId === section.id && dragOverItemIndex === itemIdx && draggedItem?.index !== itemIdx ? 'ring-2 ring-purple-500 ring-offset-2 scale-[1.01] bg-purple-100/70 dark:bg-purple-950/70 shadow-md' : '',
                                        draggedItem?.item?.id === item.id && draggedItem?.item?.item_type === 'quiz' ? 'opacity-40 border-dashed border-purple-400' : ''
                                    ]"
                                >
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <!-- Drag Handle -->
                                        <div
                                            class="cursor-grab active:cursor-grabbing text-slate-300 hover:text-purple-600 dark:text-slate-600 dark:hover:text-purple-300 p-1 -ml-1 rounded hover:bg-purple-200/60 dark:hover:bg-purple-900/60 transition shrink-0"
                                            title="Tahan dan geser (drag & drop) untuk memindahkan urutan kuis"
                                        >
                                            <GripVertical class="h-4 w-4" />
                                        </div>

                                        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 shrink-0">
                                            <FileQuestion class="h-4 w-4" />
                                        </div>
                                        <div class="min-w-0">
                                            <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                Kuis: {{ item.title }}
                                            </p>
                                            <p class="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                                                Passing Score: {{ item.passing_score }}% • {{ (item.quiz_questions || []).length }} Butir Soal
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1 shrink-0">
                                        <div class="flex items-center gap-0.5 border-r border-purple-200 dark:border-purple-800 pr-1.5 mr-1">
                                            <button
                                                type="button"
                                                @click="moveSectionItem(section, itemIdx, 'up')"
                                                :disabled="itemIdx === 0"
                                                class="p-1 text-slate-400 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded hover:bg-purple-100 dark:hover:bg-purple-900"
                                                title="Pindahkan Kuis Ke Atas"
                                            >
                                                <ChevronUp class="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                @click="moveSectionItem(section, itemIdx, 'down')"
                                                :disabled="itemIdx === getSectionItems(section).length - 1"
                                                class="p-1 text-slate-400 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-slate-400 transition rounded hover:bg-purple-100 dark:hover:bg-purple-900"
                                                title="Pindahkan Kuis Ke Bawah"
                                            >
                                                <ChevronDown class="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            @click="editQuiz(item, section.id)"
                                            class="p-2 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-white dark:hover:bg-slate-700 transition"
                                            title="Lihat / Edit Soal Kuis"
                                        >
                                            <Edit2 class="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            @click="deleteQuiz(item)"
                                            class="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition"
                                            title="Hapus Kuis"
                                        >
                                            <Trash2 class="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </template>

                            <p v-if="!getSectionItems(section).length" class="text-xs text-slate-400 italic py-2">
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

                    <div class="space-y-1.5">
                        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Thumbnail Gambar Kursus
                        </label>
                        <div class="flex items-center gap-2">
                            <input
                                type="text"
                                v-model="course.thumbnail"
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
                        <div v-if="course.thumbnail" class="mt-2 relative w-48 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                            <img :src="course.thumbnail" alt="Thumbnail Preview" class="w-full h-full object-cover" />
                        </div>
                    </div>

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
