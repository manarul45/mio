<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Badge from '~/components/UI/Badge.vue';
import LoadingState from '~/components/UI/LoadingState.vue';
import {
    DollarSign,
    Users,
    BookOpen,
    Star,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user, isAdmin } = useAuthProfile();
const supabase = useSupabaseClient();

const loading = ref(true);
const stats = ref({
    total_revenue: 0,
    total_students: 0,
    total_courses: 0,
});
const coursePerformances = ref<any[]>([]);

const formatRupiah = (val: number) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(val);
};

const loadAnalytics = async () => {
    if (!user.value) return;
    loading.value = true;
    try {
        let query = supabase
            .from('courses')
            .select(`
                id,
                title,
                status,
                price,
                discount_price,
                enrollments(count),
                course_reviews(rating)
            `);

        if (!isAdmin.value) {
            query = query.eq('instructor_id', user.value.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        let totalRevenue = 0;
        let totalStudents = 0;

        coursePerformances.value = (data || []).map((c: any) => {
            const studentCount = c.enrollments?.[0]?.count || 0;
            const effPrice = c.discount_price || c.price || 0;
            const revenue = studentCount * effPrice;
            totalRevenue += revenue;
            totalStudents += studentCount;

            const reviews = c.course_reviews || [];
            const reviewsCount = reviews.length;
            const avgRating = reviewsCount > 0
                ? (reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / reviewsCount).toFixed(1)
                : '5.0';

            return {
                id: c.id,
                title: c.title,
                status: c.status || 'draft',
                students_count: studentCount,
                average_rating: avgRating,
                reviews_count: reviewsCount,
                revenue,
            };
        });

        stats.value = {
            total_revenue: totalRevenue,
            total_students: totalStudents,
            total_courses: (data || []).length,
        };
    } catch (err) {
        console.error('Failed to load instructor analytics:', err);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadAnalytics();
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between w-full">
            <div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Analitik Penjualan & Siswa
                </h1>
                <p class="text-xs text-slate-500">Pantau performa kursus, total siswa terdaftar, dan akumulasi penghasilan Anda.</p>
            </div>
        </div>

        <div v-if="loading" class="py-12">
            <LoadingState text="Memuat laporan analitik..." />
        </div>

        <div v-else class="space-y-8">
            <!-- Stats Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                        <DollarSign class="h-5 w-5" />
                    </div>
                    <div>
                        <span class="text-xs font-medium text-slate-400">Total Akumulasi Penjualan</span>
                        <p class="text-2xl font-black text-slate-900 dark:text-white">{{ formatRupiah(stats.total_revenue) }}</p>
                    </div>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                        <Users class="h-5 w-5" />
                    </div>
                    <div>
                        <span class="text-xs font-medium text-slate-400">Total Siswa Terdaftar</span>
                        <p class="text-2xl font-black text-slate-900 dark:text-white">{{ stats.total_students }} Siswa</p>
                    </div>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-2">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
                        <BookOpen class="h-5 w-5" />
                    </div>
                    <div>
                        <span class="text-xs font-medium text-slate-400">Total Kursus Dibuat</span>
                        <p class="text-2xl font-black text-slate-900 dark:text-white">{{ stats.total_courses }} Kursus</p>
                    </div>
                </div>
            </div>

            <!-- Course Performance Breakdown Table -->
            <div class="space-y-4">
                <h3 class="text-base font-bold text-slate-900 dark:text-white">
                    Performa Tiap Kursus
                </h3>

                <div class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200 dark:bg-slate-800/60 dark:border-slate-800">
                                <tr>
                                    <th class="px-6 py-4">Judul Kursus</th>
                                    <th class="px-6 py-4">Status</th>
                                    <th class="px-6 py-4">Siswa</th>
                                    <th class="px-6 py-4">Rating</th>
                                    <th class="px-6 py-4 text-right">Pendapatan</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr v-for="course in coursePerformances" :key="course.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                    <td class="px-6 py-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                                        {{ course.title }}
                                    </td>
                                    <td class="px-6 py-4">
                                        <Badge :variant="course.status === 'published' ? 'success' : 'secondary'" size="sm">
                                            {{ course.status?.toUpperCase() }}
                                        </Badge>
                                    </td>
                                    <td class="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                                        {{ course.students_count }} Siswa
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="flex items-center gap-1">
                                            <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                            <span class="font-bold text-slate-900 dark:text-white">{{ course.average_rating }}</span>
                                            <span class="text-slate-400">({{ course.reviews_count }})</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right font-black text-emerald-600">
                                        {{ formatRupiah(course.revenue) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
