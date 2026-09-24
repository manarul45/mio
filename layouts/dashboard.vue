<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import ToastContainer from '~/components/UI/ToastContainer.vue';
import {
    BookOpen,
    GraduationCap,
    Coins,
    BarChart3,
    Video,
    ShieldAlert,
    CreditCard,
    Menu,
    LogOut,
    ExternalLink,
    Users,
    MessageSquare,
    LayoutTemplate,
    HelpCircle,
    Ticket,
    FolderTree,
    Database,
    X,
    User as UserIcon,
} from 'lucide-vue-next';

const route = useRoute();
const { user, profile, isAdmin, isInstructor, logout } = useAuthProfile();

const isSidebarOpen = ref(true);
const isMobileSidebarOpen = ref(false);

const displayName = computed(() => {
    return profile.value?.name || user.value?.user_metadata?.name || user.value?.email?.split('@')[0] || 'User';
});

const userRole = computed(() => {
    return profile.value?.role || user.value?.user_metadata?.role || (isAdmin.value ? 'ADMIN' : (isInstructor.value ? 'INSTRUCTOR' : 'STUDENT'));
});

const userInitial = computed(() => {
    return displayName.value ? displayName.value[0].toUpperCase() : 'U';
});

const isActive = (path: string) => {
    if (path === '/dashboard') return route.path === '/dashboard';
    return route.path.startsWith(path);
};
</script>

<template>
    <div class="min-h-screen bg-slate-50 font-sans antialiased dark:bg-slate-950 dark:text-slate-100 flex">
        <!-- Toast feedback notifications -->
        <ToastContainer />

        <!-- Sidebar Navigation for Desktop -->
        <aside
            :class="[
                'hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 sticky top-0 h-screen z-30 shrink-0',
                isSidebarOpen ? 'w-64' : 'w-20',
            ]"
        >
            <!-- Logo & Brand Header -->
            <div class="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800">
                <NuxtLink to="/" class="flex items-center gap-3 overflow-hidden">
                    <img
                        src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
                        alt="MIO Learning Academy Logo"
                        class="h-9 w-9 shrink-0 object-contain rounded-xl"
                    />
                    <span v-if="isSidebarOpen" class="font-bold text-lg text-slate-900 dark:text-white truncate">
                        MIO Learning Academy
                    </span>
                </NuxtLink>

                <button
                    type="button"
                    @click="isSidebarOpen = !isSidebarOpen"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    title="Toggle Sidebar"
                >
                    <Menu class="h-5 w-5" />
                </button>
            </div>

            <!-- Navigation Links Section -->
            <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                <!-- Dashboard Overview Link -->
                <div class="space-y-1">
                    <NuxtLink
                        to="/dashboard"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/dashboard')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <LayoutTemplate class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Dashboard Overview</span>
                    </NuxtLink>
                </div>

                <!-- Student Menu Group -->
                <div v-if="!isAdmin" class="space-y-1">
                    <p v-if="isSidebarOpen" class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Student Learning
                    </p>
                    <NuxtLink
                        to="/my-courses"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/my-courses')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <BookOpen class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Kursus Saya</span>
                    </NuxtLink>

                    <NuxtLink
                        to="/my-certificates"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/my-certificates')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <GraduationCap class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Sertifikat Saya</span>
                    </NuxtLink>

                    <NuxtLink
                        to="/my-orders"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/my-orders')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <CreditCard class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Riwayat Transaksi</span>
                    </NuxtLink>

                    <NuxtLink
                        to="/affiliate"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/affiliate')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <Coins class="h-5 w-5 shrink-0 text-amber-500" />
                        <span v-if="isSidebarOpen">Program Afiliasi</span>
                    </NuxtLink>
                </div>

                <!-- Instructor Menu Group (Instruktur & Admin) -->
                <div v-if="isInstructor || isAdmin" class="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p v-if="isSidebarOpen" class="px-3 text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                        Instructor Studio
                    </p>
                    <NuxtLink
                        to="/instructor/courses"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/instructor/courses')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <Video class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Manajemen Kursus</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/instructor/analytics"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/instructor/analytics')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <BarChart3 class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Analitik Penjualan</span>
                    </NuxtLink>
                </div>

                <!-- Admin Menu Group -->
                <div v-if="isAdmin" class="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p v-if="isSidebarOpen" class="px-3 text-[11px] font-bold uppercase tracking-wider text-purple-500">
                        Administration
                    </p>
                    <NuxtLink
                        to="/admin/users"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/users')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <Users class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Manajemen Pengguna</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/finance"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/finance')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <CreditCard class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Laporan Keuangan</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/withdrawals"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/withdrawals')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <Coins class="h-5 w-5 shrink-0 text-amber-500" />
                        <span v-if="isSidebarOpen">Penarikan Afiliasi</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/landing-pages"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/landing-pages')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <LayoutTemplate class="h-5 w-5 shrink-0 text-indigo-500" />
                        <span v-if="isSidebarOpen">Landing Pages</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/moderation"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/moderation')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <ShieldAlert class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Moderasi Kursus</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/audit-logs"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/audit-logs')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <ShieldAlert class="h-5 w-5 shrink-0 text-rose-500" />
                        <span v-if="isSidebarOpen">Log Audit</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/database"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/database')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <Database class="h-5 w-5 shrink-0 text-purple-500" />
                        <span v-if="isSidebarOpen">Database & Backup</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/categories"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/categories')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <FolderTree class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Kategori Kursus</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/whatsapp-templates"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/whatsapp-templates')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <MessageSquare class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Template WhatsApp</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/vouchers"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/vouchers')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <Ticket class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Kode Voucher</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/admin/settings"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/admin/settings')
                                ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <BarChart3 class="h-5 w-5 shrink-0" />
                        <span v-if="isSidebarOpen">Pengaturan Sistem</span>
                    </NuxtLink>
                </div>

                <!-- Pusat Panduan / Help Link -->
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <NuxtLink
                        to="/guide"
                        :class="[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive('/guide')
                                ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                    >
                        <HelpCircle class="h-5 w-5 shrink-0 text-indigo-500" />
                        <span v-if="isSidebarOpen">Panduan & Bantuan</span>
                    </NuxtLink>
                </div>
            </div>

            <!-- User Footer Profile Card -->
            <div class="border-t border-slate-100 p-3 dark:border-slate-800">
                <div class="flex items-center justify-between rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                    <NuxtLink to="/profile" class="flex items-center gap-3 min-w-0 hover:opacity-80 transition cursor-pointer" title="Kelola Profil & Keamanan">
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {{ userInitial }}
                        </div>
                        <div v-if="isSidebarOpen" class="truncate">
                            <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{{ displayName }}</p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ userRole }}</p>
                        </div>
                    </NuxtLink>

                    <div class="flex items-center gap-1">
                        <NuxtLink to="/profile" v-if="isSidebarOpen" class="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 transition shadow-sm dark:hover:bg-slate-700" title="Profil">
                            <UserIcon class="h-4 w-4" />
                        </NuxtLink>
                        <button
                            v-if="isSidebarOpen"
                            type="button"
                            @click="logout"
                            class="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600 transition shadow-sm dark:hover:bg-slate-700"
                            title="Logout"
                        >
                            <LogOut class="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

        </aside>

        <!-- Mobile Drawer Sidebar Slide-over Overlay -->
        <div
            v-if="isMobileSidebarOpen"
            class="fixed inset-0 z-50 flex md:hidden"
            role="dialog"
            aria-modal="true"
        >
            <!-- Backdrop -->
            <div
                class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                @click="isMobileSidebarOpen = false"
            ></div>

            <!-- Drawer Container -->
            <div class="relative flex w-full max-w-xs flex-1 flex-col bg-white pb-4 pt-5 shadow-2xl dark:bg-slate-900">
                <!-- Close Button & Brand Header -->
                <div class="flex items-center justify-between px-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <NuxtLink to="/" @click="isMobileSidebarOpen = false" class="flex items-center gap-3">
                        <img
                            src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
                            alt="MIO Learning Academy Logo"
                            class="h-9 w-9 shrink-0 object-contain rounded-xl"
                        />
                        <span class="font-bold text-lg text-slate-900 dark:text-white">MIO Learning Academy</span>
                    </NuxtLink>

                    <button
                        type="button"
                        @click="isMobileSidebarOpen = false"
                        class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <!-- Navigation Links for Mobile -->
                <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                    <div class="space-y-1">
                        <NuxtLink
                            to="/dashboard"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/dashboard')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <LayoutTemplate class="h-5 w-5 shrink-0" />
                            <span>Dashboard Overview</span>
                        </NuxtLink>
                    </div>

                    <!-- Student Menu Group -->
                    <div v-if="!isAdmin" class="space-y-1">
                        <p class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Student Learning
                        </p>
                        <NuxtLink
                            to="/my-courses"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/my-courses')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <BookOpen class="h-5 w-5 shrink-0" />
                            <span>Kursus Saya</span>
                        </NuxtLink>

                        <NuxtLink
                            to="/my-certificates"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/my-certificates')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <GraduationCap class="h-5 w-5 shrink-0" />
                            <span>Sertifikat Saya</span>
                        </NuxtLink>

                        <NuxtLink
                            to="/my-orders"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/my-orders')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <CreditCard class="h-5 w-5 shrink-0" />
                            <span>Riwayat Transaksi</span>
                        </NuxtLink>

                        <NuxtLink
                            to="/affiliate"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/affiliate')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <Coins class="h-5 w-5 shrink-0 text-amber-500" />
                            <span>Program Afiliasi</span>
                        </NuxtLink>
                    </div>

                    <!-- Instructor Menu Group -->
                    <div v-if="isInstructor || isAdmin" class="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p class="px-3 text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                            Instructor Studio
                        </p>
                        <NuxtLink
                            to="/instructor/courses"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/instructor/courses')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <Video class="h-5 w-5 shrink-0" />
                            <span>Manajemen Kursus</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/instructor/analytics"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/instructor/analytics')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                        ]"
                        >
                            <BarChart3 class="h-5 w-5 shrink-0" />
                            <span>Analitik Penjualan</span>
                        </NuxtLink>
                    </div>

                    <!-- Admin Menu Group -->
                    <div v-if="isAdmin" class="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p class="px-3 text-[11px] font-bold uppercase tracking-wider text-purple-500">
                            Administration
                        </p>
                        <NuxtLink
                            to="/admin/users"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/users')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <Users class="h-5 w-5 shrink-0" />
                            <span>Manajemen Pengguna</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/finance"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/finance')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <CreditCard class="h-5 w-5 shrink-0" />
                            <span>Laporan Keuangan</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/withdrawals"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/withdrawals')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <Coins class="h-5 w-5 shrink-0 text-amber-500" />
                            <span>Penarikan Afiliasi</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/landing-pages"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/landing-pages')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <LayoutTemplate class="h-5 w-5 shrink-0 text-indigo-500" />
                            <span>Landing Pages</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/moderation"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/moderation')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <ShieldAlert class="h-5 w-5 shrink-0" />
                            <span>Moderasi Kursus</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/audit-logs"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/audit-logs')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <ShieldAlert class="h-5 w-5 shrink-0 text-rose-500" />
                            <span>Log Audit</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/database"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/database')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <Database class="h-5 w-5 shrink-0 text-purple-500" />
                            <span>Database & Backup</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/categories"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/categories')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <FolderTree class="h-5 w-5 shrink-0" />
                            <span>Kategori Kursus</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/whatsapp-templates"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/whatsapp-templates')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <MessageSquare class="h-5 w-5 shrink-0" />
                            <span>Template WhatsApp</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/vouchers"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/vouchers')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <Ticket class="h-5 w-5 shrink-0" />
                            <span>Kode Voucher</span>
                        </NuxtLink>
                        <NuxtLink
                            to="/admin/settings"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/admin/settings')
                                    ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <BarChart3 class="h-5 w-5 shrink-0" />
                            <span>Pengaturan Sistem</span>
                        </NuxtLink>
                    </div>

                    <!-- Pusat Panduan / Help Link Mobile -->
                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <NuxtLink
                            to="/guide"
                            @click="isMobileSidebarOpen = false"
                            :class="[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive('/guide')
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                            ]"
                        >
                            <HelpCircle class="h-5 w-5 shrink-0 text-indigo-500" />
                            <span>Panduan & Bantuan</span>
                        </NuxtLink>
                    </div>
                </div>

                <!-- User Footer in Mobile Drawer -->
                <div class="border-t border-slate-100 p-4 dark:border-slate-800">
                    <div class="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <NuxtLink to="/profile" @click="isMobileSidebarOpen = false" class="flex items-center gap-3 min-w-0 hover:opacity-80 transition cursor-pointer" title="Kelola Profil & Keamanan">
                            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {{ userInitial }}
                            </div>
                            <div class="truncate">
                                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{{ displayName }}</p>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ user?.email }}</p>
                            </div>
                        </NuxtLink>

                        <button
                            type="button"
                            @click="logout"
                            class="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/40"

                            title="Logout"
                        >
                            <LogOut class="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
            <!-- Top App Bar (Mobile First) -->
            <header class="min-h-16 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 dark:border-slate-800 dark:bg-slate-900/95">
                <div class="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <button
                        type="button"
                        @click="isMobileSidebarOpen = true"
                        class="md:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition dark:text-slate-300 dark:hover:bg-slate-800 shrink-0"
                        title="Buka Menu"
                    >
                        <Menu class="h-5 w-5" />
                    </button>

                    <div class="min-w-0 flex-1">
                        <slot name="header">
                            <h1 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                Dashboard
                            </h1>
                        </slot>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                    <NuxtLink
                        to="/courses"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                        <span class="hidden sm:inline">Jelajah Kursus</span>
                        <ExternalLink class="h-3.5 w-3.5" />
                    </NuxtLink>
                </div>
            </header>

            <!-- Page Slot Content -->
            <main class="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
                <slot />
            </main>
        </div>
    </div>
</template>
