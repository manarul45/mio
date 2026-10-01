// Berlaku otomatis untuk semua halaman di bawah /admin, termasuk halaman admin baru.
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/admin' && !to.path.startsWith('/admin/')) return

  const user = useSupabaseUser()
  const { profile, fetchProfile, isAdmin } = useAuthProfile()

  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  if (!profile.value) {
    await fetchProfile()
  }

  if (!isAdmin.value) {
    return navigateTo('/dashboard')
  }
})
