<script setup lang="ts">
import { ref } from 'vue'
import ToastContainer from '~/components/UI/ToastContainer.vue'
import { LogOut, BookOpen, HelpCircle, Menu, X, ArrowRight } from 'lucide-vue-next'

const { user, profile, isAdmin, isInstructor, logout } = useAuthProfile()
const isMobileMenuOpen = ref(false)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased dark:bg-slate-950 dark:text-slate-100">
    <!-- Toast feedback notifications -->
    <ToastContainer />

    <!-- Navigation Bar -->
    <header class="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Brand Logo & Main Nav -->
        <div class="flex items-center gap-8">
          <NuxtLink to="/" class="flex items-center gap-2.5 font-bold text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
            <img
              src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
              alt="MIO Learning Academy Logo"
              class="h-9 w-9 object-contain rounded-xl"
            />
            <span class="text-slate-900 dark:text-white">MIO Learning Academy</span>
          </NuxtLink>

          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <NuxtLink to="/courses" class="hover:text-indigo-600 transition-colors">
              Jelajah Kursus
            </NuxtLink>
            <NuxtLink to="/guide" class="hover:text-indigo-600 transition-colors">
              Panduan & Bantuan
            </NuxtLink>
          </nav>
        </div>

        <!-- Auth / User Actions -->
        <div class="flex items-center gap-3">
          <template v-if="user">
            <NuxtLink
              v-if="isInstructor"
              to="/instructor/courses"
              class="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              Instructor Hub
            </NuxtLink>

            <NuxtLink
              v-if="isAdmin"
              to="/admin/database"
              class="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition dark:bg-purple-950/60 dark:text-purple-300"
            >
              Admin Portal
            </NuxtLink>

            <NuxtLink
              to="/dashboard"
              class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition dark:bg-slate-800 dark:text-slate-200"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>{{ profile?.name || user.email?.split('@')[0] }}</span>
            </NuxtLink>

            <button
              type="button"
              @click="logout"
              class="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800"
              title="Keluar"
            >
              <LogOut class="h-5 w-5" />
            </button>
          </template>

          <template v-else>
            <NuxtLink
              to="/login"
              class="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition"
            >
              Masuk Akun
            </NuxtLink>
          </template>

          <!-- Mobile Hamburger Button -->
          <button
            type="button"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu v-if="!isMobileMenuOpen" class="w-6 h-6" />
            <X v-else class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown -->
      <div v-if="isMobileMenuOpen" class="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2 dark:border-slate-800 dark:bg-slate-900">
        <NuxtLink
          to="/courses"
          class="block py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-300"
          @click="isMobileMenuOpen = false"
        >
          Jelajah Kursus
        </NuxtLink>
        <NuxtLink
          to="/guide"
          class="block py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-300"
          @click="isMobileMenuOpen = false"
        >
          Panduan & Bantuan
        </NuxtLink>
        <template v-if="user">
          <NuxtLink
            to="/dashboard"
            class="block py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-300"
            @click="isMobileMenuOpen = false"
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            v-if="isInstructor"
            to="/instructor/courses"
            class="block py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400"
            @click="isMobileMenuOpen = false"
          >
            Instructor Studio
          </NuxtLink>
          <NuxtLink
            v-if="isAdmin"
            to="/admin/database"
            class="block py-2 text-sm font-medium text-purple-700 dark:text-purple-400"
            @click="isMobileMenuOpen = false"
          >
            Admin Portal
          </NuxtLink>
        </template>
      </div>
    </header>

    <!-- Main Content Body -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-900 dark:text-white">Manarul Ilmi Online Academy</span>
          <span>&copy; {{ new Date().getFullYear() }} All rights reserved.</span>
        </div>
        <div class="flex items-center gap-6">
          <NuxtLink to="/courses" class="hover:text-indigo-600 transition">Katalog Kursus</NuxtLink>
          <NuxtLink to="/guide" class="hover:text-indigo-600 transition">Panduan & Tutorial</NuxtLink>
          <NuxtLink to="/login" class="hover:text-indigo-600 transition">Masuk Akun</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
