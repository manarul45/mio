<script setup lang="ts">
import { ref } from 'vue'
import { LogOut, BookOpen, HelpCircle, LayoutDashboard, Shield, GraduationCap, Menu, X, Database } from 'lucide-vue-next'

const { user, profile, isAdmin, isInstructor, logout } = useAuthProfile()
const isMobileMenuOpen = ref(false)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
    <!-- Navigation Bar -->
    <header class="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Brand Logo & Main Nav -->
        <div class="flex items-center gap-8">
          <NuxtLink to="/" class="flex items-center gap-2.5 font-bold text-xl tracking-tight text-indigo-600">
            <img
              src="https://res.cloudinary.com/yukfutsal/image/upload/v1788230434/Untitled_200_x_200_px_1_wvt9eg.png"
              alt="MIO Learning Academy Logo"
              class="h-9 w-9 object-contain rounded-xl"
            />
            <span class="text-slate-900">MIO Learning Academy</span>
          </NuxtLink>

          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <NuxtLink to="/courses" class="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
              <BookOpen class="w-4 h-4" />
              <span>Jelajah Kursus</span>
            </NuxtLink>
            <NuxtLink to="/guide" class="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
              <HelpCircle class="w-4 h-4" />
              <span>Panduan</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- Auth / User Actions -->
        <div class="flex items-center gap-3">
          <template v-if="user">
            <NuxtLink
              v-if="isInstructor"
              to="/instructor/courses"
              class="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <GraduationCap class="w-3.5 h-3.5" />
              <span>Instructor Studio</span>
            </NuxtLink>

            <NuxtLink
              v-if="isAdmin"
              to="/admin/import"
              class="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <Database class="w-3.5 h-3.5" />
              <span>Import SQL</span>
            </NuxtLink>

            <NuxtLink
              v-if="isAdmin"
              to="/admin/moderation"
              class="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
            >
              <Shield class="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </NuxtLink>

            <NuxtLink
              to="/dashboard"
              class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>{{ profile?.name || user.email?.split('@')[0] }}</span>
            </NuxtLink>

            <button
              @click="logout"
              class="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
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

          <!-- Mobile Hamburger -->
          <button
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <Menu v-if="!isMobileMenuOpen" class="w-6 h-6" />
            <X v-else class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown -->
      <div v-if="isMobileMenuOpen" class="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2">
        <NuxtLink
          to="/courses"
          class="block py-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
          @click="isMobileMenuOpen = false"
        >
          Jelajah Kursus
        </NuxtLink>
        <NuxtLink
          to="/guide"
          class="block py-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
          @click="isMobileMenuOpen = false"
        >
          Panduan & Bantuan
        </NuxtLink>
        <template v-if="user">
          <NuxtLink
            to="/dashboard"
            class="block py-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
            @click="isMobileMenuOpen = false"
          >
            Dashboard Belajar
          </NuxtLink>
          <NuxtLink
            v-if="isInstructor"
            to="/instructor/courses"
            class="block py-2 text-sm font-medium text-indigo-700"
            @click="isMobileMenuOpen = false"
          >
            Instructor Studio
          </NuxtLink>
          <NuxtLink
            v-if="isAdmin"
            to="/admin/moderation"
            class="block py-2 text-sm font-medium text-purple-700"
            @click="isMobileMenuOpen = false"
          >
            Admin Panel
          </NuxtLink>
        </template>
      </div>
    </header>

    <!-- Main Content Slot -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Global Footer -->
    <footer class="border-t border-slate-200/80 bg-white py-8 text-center text-sm text-slate-500">
      <div class="max-w-7xl mx-auto px-4">
        <p>&copy; {{ new Date().getFullYear() }} MIO Learning Academy (Manarul Ilmi Online Learning Academy). All rights reserved.</p>
        <p class="text-xs text-slate-400 mt-1">Ditenagai oleh Supabase & Vercel</p>
      </div>
    </footer>
  </div>
</template>
