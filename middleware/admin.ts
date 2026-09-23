export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()
  const { profile, fetchProfile } = useAuthProfile()

  if (!user.value) {
    return navigateTo('/login')
  }

  if (!profile.value) {
    await fetchProfile()
  }

  if (!profile.value || (profile.value.role !== 'ADMIN' && profile.value.role !== 'SUPER_ADMIN')) {
    return navigateTo('/dashboard')
  }
})
