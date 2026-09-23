export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  const { profile, fetchProfile, isAdmin } = useAuthProfile()

  if (!user.value) {
    return navigateTo('/login')
  }

  if (!profile.value) {
    await fetchProfile()
  }

  const isUserAdmin = isAdmin.value ||
    profile.value?.role === 'ADMIN' ||
    profile.value?.role === 'SUPER_ADMIN' ||
    user.value?.user_metadata?.role === 'ADMIN' ||
    user.value?.user_metadata?.role === 'SUPER_ADMIN'

  if (!isUserAdmin) {
    return navigateTo('/dashboard')
  }
})
