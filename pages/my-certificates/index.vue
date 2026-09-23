<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import EmptyState from '~/components/UI/EmptyState.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import {
    Award,
    ExternalLink,
    Calendar,
    CheckCircle2,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user } = useAuthProfile();
const supabase = useSupabaseClient();

const loading = ref(true);
const certificates = ref<any[]>([]);

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const loadCertificates = async () => {
    if (!user.value) return;
    loading.value = true;
    try {
        const { data, error } = await supabase
            .from('certificates')
            .select(`
                id,
                certificate_code,
                issued_at,
                courses:course_id(
                    title,
                    profiles:instructor_id(name)
                )
            `)
            .eq('user_id', user.value.id)
            .order('issued_at', { ascending: false });

        if (error) throw error;
        certificates.value = (data || []).map((c: any) => ({
            id: c.id,
            certificate_code: c.certificate_code,
            issued_at: c.issued_at,
            course: {
                title: c.courses?.title,
                instructor: c.courses?.profiles,
            },
        }));
    } catch (err) {
        console.error('Failed to load certificates:', err);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadCertificates();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between w-full">
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Sertifikat Kelulusan Saya
                </h1>
                <p class="text-xs text-slate-500">Bukti resmi penyelesaian kursus dengan kode verifikasi unik.</p>
            </div>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat sertifikat Anda..." />
        </div>

        <div v-else class="space-y-6">
            <div v-if="certificates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                    v-for="cert in certificates"
                    :key="cert.id"
                    class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4"
                >
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                                <Award class="h-5 w-5" />
                            </div>
                            <Badge variant="success" size="sm">
                                <CheckCircle2 class="mr-1 h-3 w-3" />
                                <span>Terverifikasi</span>
                            </Badge>
                        </div>

                        <div>
                            <span class="text-[10px] font-mono text-slate-400">#{{ cert.certificate_code }}</span>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                                {{ cert.course?.title }}
                            </h3>
                            <p class="text-xs text-slate-500 mt-1">
                                Instruktur: <span class="font-medium text-slate-700 dark:text-slate-300">{{ cert.course?.instructor?.name || 'Instruktur MIO' }}</span>
                            </p>
                        </div>

                        <div class="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar class="h-3.5 w-3.5" />
                            <span>Diterbitkan {{ formatDate(cert.issued_at) }}</span>
                        </div>
                    </div>

                    <Button
                        as="Link"
                        :href="`/certificates/${cert.certificate_code}`"
                        variant="secondary"
                        size="md"
                        class="w-full justify-center"
                    >
                        <ExternalLink class="mr-1.5 h-4 w-4" />
                        <span>Lihat & Verifikasi Sertifikat</span>
                    </Button>
                </div>
            </div>

            <EmptyState
                v-else
                title="Belum Ada Sertifikat Kelulusan"
                description="Selesaikan 100% video materi dan kuis evaluasi pada kursus Anda untuk mendapatkan sertifikat."
                action-text="Lihat Kursus Saya"
                action-href="/my-courses"
            />
        </div>
    </div>
</template>
