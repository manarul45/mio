import type { Profile, UserRole } from '~/types/database.types'

export const useAuthProfile = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const profile = useState<Profile | null>('auth_profile', () => null)
  const loading = useState<boolean>('auth_profile_loading', () => false)

  const fetchProfile = async () => {
    if (!user.value) {
      profile.value = null
      return null
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      profile.value = data as Profile
      return data as Profile
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
    return profile.value?.role === 'ADMIN' || profile.value?.role === 'SUPER_ADMIN'
  })

  const isInstructor = computed(() => {
    return profile.value?.role === 'INSTRUCTOR' || isAdmin.value
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
