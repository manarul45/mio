<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import Button from '~/components/UI/Button.vue';
import Badge from '~/components/UI/Badge.vue';
import {
    BookOpen,
    CreditCard,
    GraduationCap,
    ArrowRight,
    Sparkles,
    Users,
    Clock,
    PlusCircle,
    TrendingUp,
    ShieldCheck,
    Video,
    MessageSquare,
    CheckCircle2,
} from 'lucide-vue-next';

definePageMeta({
    layout: 'dashboard',
});

const { user, profile, isAdmin } = useAuthProfile();
const supabase = useSupabaseClient();

const loading = ref(true);

// Admin Stats State
const adminStats = ref({
    total_sales: 0,
    pending_orders_count: 0,
    total_users: 0,
    total_courses: 0,
});
const recentOrders = ref<any[]>([]);

// Student Stats State
const studentStats = ref({
    enrolled_count: 0,
    completed_count: 0,
    certificates_count: 0,
});
const recentEnrollments = ref<any[]>([]);

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val || 0);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const loadDashboardData = async () => {
    loading.value = true;
    try {
        if (isAdmin.value) {
            // 1. Fetch Paid Orders for Sales
            const { data: paidOrders } = await supabase
                .from('orders')
                .select('final_amount')
                .eq('status', 'paid');
            
            const totalSales = (paidOrders || []).reduce((acc: number, curr: any) => acc + (Number(curr.final_amount) || 0), 0);
            
            // 2. Pending Orders Count
            const { count: pendingCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            // 3. Total Users Count
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 4. Total Courses Count
            const { count: coursesCount } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true });

            adminStats.value = {
                total_sales: totalSales,
                pending_orders_count: pendingCount || 0,
                total_users: usersCount || 0,
                total_courses: coursesCount || 0,
            };

            // 5. Recent 5 Orders
            const { data: orders } = await supabase
                .from('orders')
                .select('id, order_number, final_amount, status, created_at, customer_whatsapp, profiles:user_id(name, email), order_items(course:course_id(title))')
                .order('created_at', { ascending: false })
                .limit(5);

            recentOrders.value = (orders || []).map((o: any) => ({
                id: o.id,
                order_number: o.order_number,
                final_amount: o.final_amount,
                status: o.status,
                created_at: o.created_at,
                customer_whatsapp: o.customer_whatsapp,
                user: o.profiles,
                items: (o.order_items || []).map((item: any) => ({ course: item.course })),
            }));
        }

        // Student Data
        if (user.value) {
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('*, courses:course_id(*)')
                .eq('user_id', user.value.id);

            const allEnrollments = enrollments || [];
            const completed = allEnrollments.filter((e: any) => e.progress_percentage === 100);

            const { count: certCount } = await supabase
                .from('certificates')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.value.id);

            studentStats.value = {
                enrolled_count: allEnrollments.length,
                completed_count: completed.length,
                certificates_count: certCount || 0,
            };

            recentEnrollments.value = allEnrollments.slice(0, 3);
        }
    } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadDashboardData();
});

const userDisplayName = computed(() => {
    return profile.value?.name || user.value?.user_metadata?.name || user.value?.email?.split('@')[0] || 'Pengguna';
});

const userRoleBadge = computed(() => {
    return profile.value?.role || (isAdmin.value ? 'ADMIN' : 'STUDENT');
});
</script>

<template>
    <div>
        <div class="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <h1 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {{ isAdmin ? 'Overview Dashboard Administrator' : 'Overview Dashboard Siswa' }}
            </h1>
            <Badge :variant="isAdmin ? 'purple' : 'primary'" size="sm">
                {{ userRoleBadge }}
            </Badge>
        </div>

        <!-- ========================================== -->
        <!-- 1. ADMIN DASHBOARD VIEW                    -->
        <!-- ========================================== -->
        <div v-if="isAdmin" class="space-y-8 pb-10">
            <!-- Admin Welcome Banner -->
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-purple-900/40">
                <div class="relative z-10 max-w-3xl">
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-xs font-bold text-purple-200 backdrop-blur-md">
                        <ShieldCheck class="h-3.5 w-3.5 text-purple-300" />
                        <span>Administrator Workspace</span>
                    </span>
                    <h2 class="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Halo, {{ userDisplayName }}!
                    </h2>
                    <p class="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Pusat kendali platform e-learning MIO Learning Academy: kelola modul kursus, approval pembayaran, manajemen pengguna, dan kustomisasi notifikasi.
                    </p>
                    <div class="mt-6 flex flex-wrap items-center gap-3">
                        <Button as="Link" href="/instructor/courses/create" variant="primary" size="md" class="bg-indigo-600 hover:bg-indigo-700">
                            <PlusCircle class="mr-1.5 h-4 w-4" />
                            <span>Buat Kursus Baru</span>
                        </Button>
                        <Button as="Link" href="/admin/finance" variant="secondary" size="md" class="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700">
                            <CreditCard class="mr-1.5 h-4 w-4 text-emerald-400" />
                            <span>Laporan Keuangan</span>
                        </Button>
                        <Button as="Link" href="/admin/users" variant="secondary" size="md" class="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700">
                            <Users class="mr-1.5 h-4 w-4 text-purple-400" />
                            <span>Manajemen Pengguna</span>
                        </Button>
                    </div>
                </div>

                <!-- Decorative blur elements -->
                <div class="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none"></div>
                <div class="absolute right-32 top-0 h-48 w-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none"></div>
            </div>

            <!-- Admin Key Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <!-- Stat 1: Total Sales -->
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Penjualan</p>
                        <p class="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                            {{ formatCurrency(adminStats.total_sales) }}
                        </p>
                        <p class="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <TrendingUp class="h-3 w-3" />
                            <span>Akumulasi transaksi lunas</span>
                        </p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <TrendingUp class="h-6 w-6" />
                    </div>
                </div>

                <!-- Stat 2: Pending Orders -->
                <NuxtLink
                    to="/admin/finance"
                    class="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 flex items-center justify-between hover:border-amber-300 transition-colors group"
                >
                    <div>
                        <p class="text-xs font-medium text-amber-800 dark:text-amber-300">Menunggu Approval</p>
                        <p class="mt-1 text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-200">
                            {{ adminStats.pending_orders_count }} <span class="text-xs font-normal text-slate-500">Pesanan</span>
                        </p>
                        <p class="mt-1 text-[11px] text-amber-700 font-medium group-hover:underline flex items-center gap-1">
                            <span>Periksa di menu finance</span>
                            <ArrowRight class="h-3 w-3" />
                        </p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
                        <Clock class="h-6 w-6" />
                    </div>
                </NuxtLink>

                <!-- Stat 3: Total Users -->
                <NuxtLink
                    to="/admin/users"
                    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between hover:border-purple-300 transition-colors group"
                >
                    <div>
                        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Pengguna</p>
                        <p class="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                            {{ adminStats.total_users }} <span class="text-xs font-normal text-slate-500">Akun</span>
                        </p>
                        <p class="mt-1 text-[11px] text-purple-600 font-medium group-hover:underline flex items-center gap-1">
                            <span>Kelola pengguna & role</span>
                            <ArrowRight class="h-3 w-3" />
                        </p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                        <Users class="h-6 w-6" />
                    </div>
                </NuxtLink>

                <!-- Stat 4: Total Courses -->
                <NuxtLink
                    to="/instructor/courses"
                    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between hover:border-indigo-300 transition-colors group"
                >
                    <div>
                        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Kursus Aktif</p>
                        <p class="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                            {{ adminStats.total_courses }} <span class="text-xs font-normal text-slate-500">Kursus</span>
                        </p>
                        <p class="mt-1 text-[11px] text-indigo-600 font-medium group-hover:underline flex items-center gap-1">
                            <span>Buka Instructor Studio</span>
                            <ArrowRight class="h-3 w-3" />
                        </p>
                    </div>
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <BookOpen class="h-6 w-6" />
                    </div>
                </NuxtLink>
            </div>

            <!-- Admin Quick Actions Grid -->
            <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                    Pusat Manajemen Utama
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <!-- Action 1: Users -->
                    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 mb-4">
                                <Users class="h-5 w-5" />
                            </div>
                            <h4 class="text-base font-bold text-slate-900 dark:text-white">
                                Manajemen Pengguna
                            </h4>
                            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Tambah pengguna, atur peran (Student/Instructor/Admin), dan kelola akun secara terpusat.
                            </p>
                        </div>
                        <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <NuxtLink to="/admin/users" class="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400">
                                <span>Buka Manajemen User</span>
                                <ArrowRight class="h-3.5 w-3.5" />
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- Action 2: Finance & Orders -->
                    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4">
                                <CreditCard class="h-5 w-5" />
                            </div>
                            <h4 class="text-base font-bold text-slate-900 dark:text-white">
                                Laporan Keuangan
                            </h4>
                            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Verifikasi bukti transfer manual via WhatsApp, approve pesanan, dan pantau omset total penjualan.
                            </p>
                        </div>
                        <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <NuxtLink to="/admin/finance" class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                                <span>Buka Keuangan</span>
                                <ArrowRight class="h-3.5 w-3.5" />
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- Action 3: Instructor Studio -->
                    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4">
                                <Video class="h-5 w-5" />
                            </div>
                            <h4 class="text-base font-bold text-slate-900 dark:text-white">
                                Instructor Studio
                            </h4>
                            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Buat kursus baru, rancang kurikulum, unggah video pembelajaran YouTube, dan buat kuis bersertifikat.
                            </p>
                        </div>
                        <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <NuxtLink to="/instructor/courses" class="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                                <span>Buka Instructor Studio</span>
                                <ArrowRight class="h-3.5 w-3.5" />
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- Action 4: Database & Backup -->
                    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 mb-4">
                                <ShieldCheck class="h-5 w-5" />
                            </div>
                            <h4 class="text-base font-bold text-slate-900 dark:text-white">
                                Database & Backup
                            </h4>
                            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Fasilitas ekspor tabel, backup database, dan eksekusi SQL langsung di server Supabase.
                            </p>
                        </div>
                        <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <NuxtLink to="/admin/database" class="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400">
                                <span>Buka Database & Backup</span>
                                <ArrowRight class="h-3.5 w-3.5" />
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Orders Section -->
            <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">
                            Transaksi Terbaru
                        </h3>
                        <p class="text-xs text-slate-500">Daftar transaksi pesanan kursus terkini yang masuk ke sistem.</p>
                    </div>
                    <Button as="Link" href="/admin/finance" variant="ghost" size="sm">
                        <span>Lihat Semua Pesanan</span>
                        <ArrowRight class="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>

                <div v-if="recentOrders.length === 0" class="py-8 text-center text-xs text-slate-400">
                    Belum ada transaksi pesanan yang tercatat.
                </div>

                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-4 py-3">No. Order</th>
                                <th class="px-4 py-3">Pembeli</th>
                                <th class="px-4 py-3">Kursus</th>
                                <th class="px-4 py-3">Nominal</th>
                                <th class="px-4 py-3">Status</th>
                                <th class="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="order in recentOrders" :key="order.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td class="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    #{{ order.order_number }}
                                </td>
                                <td class="px-4 py-3">
                                    <p class="font-bold text-slate-900 dark:text-white">{{ order.user?.name || '-' }}</p>
                                    <p class="text-[11px] text-slate-400">{{ order.customer_whatsapp || order.user?.email || '-' }}</p>
                                </td>
                                <td class="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                                    {{ order.items?.[0]?.course?.title || 'Kursus' }}
                                </td>
                                <td class="px-4 py-3 font-bold text-slate-900 dark:text-white">
                                    {{ formatCurrency(order.final_amount) }}
                                </td>
                                <td class="px-4 py-3">
                                    <Badge :variant="order.status === 'paid' ? 'success' : (order.status === 'pending' ? 'warning' : 'danger')" size="sm">
                                        {{ order.status === 'paid' ? 'Lunas' : (order.status === 'pending' ? 'Menunggu Approval' : 'Dibatalkan') }}
                                    </Badge>
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <NuxtLink to="/admin/finance" class="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                                        <span>Detail</span>
                                        <ArrowRight class="h-3 w-3" />
                                    </NuxtLink>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ========================================== -->
        <!-- 2. STUDENT DASHBOARD VIEW                  -->
        <!-- ========================================== -->
        <div v-else class="space-y-8 pb-10">
            <!-- Student Welcome Banner -->
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl">
                <div class="relative z-10 max-w-2xl">
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                        <Sparkles class="h-3.5 w-3.5 text-amber-300" />
                        <span>Ruang Belajar Siswa</span>
                    </span>
                    <h2 class="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Halo, {{ userDisplayName }}!
                    </h2>
                    <p class="mt-2 text-xs sm:text-sm text-indigo-100 leading-relaxed">
                        Mulai jelajahi kursus berkualitas tinggi, bangun keahlian baru, dan raih sertifikat kelulusan resmi Anda.
                    </p>
                    <div class="mt-6 flex flex-wrap gap-3">
                        <Button as="Link" href="/my-courses" variant="secondary" size="md">
                            <span>Lanjut Belajar</span>
                            <ArrowRight class="ml-1.5 h-4 w-4" />
                        </Button>
                        <Button
                            as="Link"
                            href="/courses"
                            variant="ghost"
                            size="md"
                            class="text-white hover:bg-white/10"
                        >
                            Jelajah Katalog Kursus
                        </Button>
                    </div>
                </div>

                <!-- Decorative blur elements -->
                <div class="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                <div class="absolute right-32 top-0 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl pointer-events-none"></div>
            </div>

            <!-- Student Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-slate-500">Kursus Diikuti</p>
                        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {{ studentStats.enrolled_count }} <span class="text-xs font-normal text-slate-400">Kelas</span>
                        </p>
                    </div>
                    <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <BookOpen class="h-5 w-5" />
                    </div>
                </div>

                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-slate-500">Kursus Selesai</p>
                        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {{ studentStats.completed_count }} <span class="text-xs font-normal text-slate-400">Kelas</span>
                        </p>
                    </div>
                    <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <CheckCircle2 class="h-5 w-5" />
                    </div>
                </div>

                <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-slate-500">Sertifikat Diraih</p>
                        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {{ studentStats.certificates_count }} <span class="text-xs font-normal text-slate-400">Sertifikat</span>
                        </p>
                    </div>
                    <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                        <GraduationCap class="h-5 w-5" />
                    </div>
                </div>
            </div>

            <!-- Student Action Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Card 1: Student Courses -->
                <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                    <div>
                        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-4">
                            <BookOpen class="h-6 w-6" />
                        </div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">
                            Kursus Saya
                        </h3>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Akses materi video pembelajaran, kuis interaktif, dan lacak progres belajar Anda.
                        </p>
                    </div>
                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <NuxtLink to="/my-courses" class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                            <span>Buka Ruang Belajar</span>
                            <ArrowRight class="h-3.5 w-3.5" />
                        </NuxtLink>
                    </div>
                </div>

                <!-- Card 2: Transaction History -->
                <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                    <div>
                        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-4">
                            <CreditCard class="h-6 w-6" />
                        </div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">
                            Riwayat Transaksi
                        </h3>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Lihat bukti pembayaran, invoice tagihan, dan status pesanan pembelian kursus Anda.
                        </p>
                    </div>
                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <NuxtLink to="/my-orders" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                            <span>Lihat Riwayat Pesanan</span>
                            <ArrowRight class="h-3.5 w-3.5" />
                        </NuxtLink>
                    </div>
                </div>

                <!-- Card 3: Certificates -->
                <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                    <div>
                        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 mb-4">
                            <GraduationCap class="h-6 w-6" />
                        </div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">
                            Sertifikat Kelulusan
                        </h3>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Klaim dan cetak sertifikat digital berlisensi setelah menyelesaikan seluruh materi & kuis.
                        </p>
                    </div>
                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <NuxtLink to="/my-certificates" class="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400">
                            <span>Lihat Sertifikat Saya</span>
                            <ArrowRight class="h-3.5 w-3.5" />
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
