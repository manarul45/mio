import type { Profile, UserRole } from '~/types/database.types'

export const useAuthProfile = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const profile = useState<Profile | null>('auth_profile', () => null)
  const loading = useState<boolean>('auth_profile_loading', () => false)

  const fetchProfile = async () => {
    if (!user.value || !user.value.id) {
      profile.value = null
      return null
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .maybeSingle()

      if (error) throw error

      let fetchedProfile = data as Profile | null
      const email = (user.value.email || '').toLowerCase().trim()
      const isAutoAdmin = email === 'admin@mioacademy.com' || email.startsWith('admin@')

      if (isAutoAdmin) {
        if (!fetchedProfile) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: user.value.id,
              name: user.value.user_metadata?.name || user.value.user_metadata?.full_name || email.split('@')[0],
              email: user.value.email,
              role: 'ADMIN'
            })
            .select('*')
            .single()
          fetchedProfile = newProfile as Profile
        } else if (fetchedProfile.role !== 'ADMIN' && fetchedProfile.role !== 'SUPER_ADMIN') {
          await supabase
            .from('profiles')
            .update({ role: 'ADMIN' })
            .eq('id', user.value.id)
          fetchedProfile.role = 'ADMIN'
        }
      }

      profile.value = fetchedProfile
      return fetchedProfile
    } catch (err) {
      console.error('Error fetching profile:', err)
      profile.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!profile.value) return false
    const allowed = Array.isArray(roles) ? roles : [roles]
    return allowed.includes(profile.value.role)
  }

  const isAdmin = computed(() => {
    const email = (user.value?.email || '').toLowerCase().trim()
    const isAutoAdmin = email === 'admin@mioacademy.com' || email.startsWith('admin@')

    return isAutoAdmin ||
           profile.value?.role === 'ADMIN' ||
           profile.value?.role === 'SUPER_ADMIN' ||
           user.value?.user_metadata?.role === 'ADMIN' ||
           user.value?.user_metadata?.role === 'SUPER_ADMIN' ||
           user.value?.app_metadata?.role === 'ADMIN' ||
           user.value?.app_metadata?.role === 'SUPER_ADMIN'
  })

  const isInstructor = computed(() => {
    return profile.value?.role === 'INSTRUCTOR' ||
           user.value?.user_metadata?.role === 'INSTRUCTOR' ||
           isAdmin.value
  })

  const logout = async () => {
    await supabase.auth.signOut()
    profile.value = null
    navigateTo('/login')
  }

  // Watch for auth changes
  watch(user, async (newUser) => {
    if (newUser) {
      await fetchProfile()
    } else {
      profile.value = null
    }
  }, { immediate: true })

  return {
    user,
    profile,
    loading,
    fetchProfile,
    hasRole,
    isAdmin,
    isInstructor,
    logout
  }
}
